import React, { useState, useEffect } from 'react';
import { useSettings } from '../utils/SettingsContext';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import {
    BrainCircuit, Sparkles, Trash2, AlertTriangle, Key, RefreshCw, Loader2,
    CircleDot, CheckSquare, ToggleLeft, ArrowRightLeft, AlignLeft, Grid, ListOrdered, Edit3
} from 'lucide-react';
import { generateAdvancedQuiz, generateQuizFromImage } from '../utils/gemini';
import BSKAP_DATA from '../utils/bskap_2025_intel.json';
import toast from 'react-hot-toast';

import Modal from '../components/Modal';
import QuizHistory from '../components/quiz/QuizHistory';
import QuizForm from '../components/quiz/QuizForm';
import QuizResults from '../components/quiz/QuizResults';
import * as QuizExportUtils from '../utils/quizExportUtils';

const QuizGeneratorPage = () => {
    const { activeSemester, academicYear } = useSettings();
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState({ stage: '', message: '', percentage: 0 });

    // Context State
    const [sourceType, setSourceType] = useState('rpp');
    const [sourceData, setSourceData] = useState([]);
    const [selectedContextId, setSelectedContextId] = useState('');
    const [contextContent, setContextContent] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [subject, setSubject] = useState('');
    const [gradeLevel, setGradeLevel] = useState('');
    const [topic, setTopic] = useState('');

    // Configuration State
    const [difficulty, setDifficulty] = useState(50);
    const [typeCounts, setTypeCounts] = useState({ pg: 10 });

    // Result State
    const [quizResult, setQuizResult] = useState(null);
    const [savedQuizzes, setSavedQuizzes] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [userProfile, setUserProfile] = useState({ name: '', school: '', nip: '', principalName: '', principalNip: '' });
    const [signingLocation, setSigningLocation] = useState('Jakarta');
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', type: '' });

    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);

    useEffect(() => {
        const savedLoc = localStorage.getItem('QUIZ_SIGNING_LOCATION');
        if (savedLoc) setSigningLocation(savedLoc);

        const fetchMasters = async () => {
            if (!auth.currentUser) return;
            try {
                const cSnap = await getDocs(query(collection(db, 'classes'), where('userId', '==', auth.currentUser.uid)));
                const sSnap = await getDocs(query(collection(db, 'subjects'), where('userId', '==', auth.currentUser.uid)));
                setClasses(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.rombel.localeCompare(b.rombel)));
                setSubjects(sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error("Error fetching masters:", error);
            }
        };
        fetchMasters();
        fetchQuizHistory();
        fetchProfile();
    }, [activeSemester]);

    const fetchSources = async () => {
        if (!auth.currentUser) return;
        setLoading(true);
        try {
            let collectionName = 'lessonPlans';
            let q;

            if (sourceType === 'rpp') {
                collectionName = 'lessonPlans';
                q = query(
                    collection(db, collectionName),
                    where('userId', '==', auth.currentUser.uid),
                    where('academicYear', '==', academicYear)
                );
            } else {
                // Promes / Program Semester
                collectionName = 'teachingPrograms';
                q = query(
                    collection(db, collectionName),
                    where('userId', '==', auth.currentUser.uid),
                    where('academicYear', '==', academicYear),
                    where('type', '!=', 'atp_document') // Exclude ATP docs
                );
            }

            const snap = await getDocs(q);
            setSourceData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching sources:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (sourceType !== 'manual' && sourceType !== 'image') fetchSources();
    }, [sourceType, academicYear]);

    const fetchQuizHistory = async () => {
        if (!auth.currentUser) return;
        setLoadingHistory(true);
        try {
            const q = query(
                collection(db, 'quizzes'),
                where('userId', '==', auth.currentUser.uid),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            setSavedQuizzes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const fetchProfile = async () => {
        if (!auth.currentUser) return;
        try {
            const pDoc = await getDoc(doc(db, 'profiles', auth.currentUser.uid));
            if (pDoc.exists()) setUserProfile(pDoc.data());
        } catch (e) { console.error(e); }
    };

    const handleDetectLocation = async () => {
        setDetectingLocation(true);
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            if (data.city) {
                setSigningLocation(data.city);
                localStorage.setItem('QUIZ_SIGNING_LOCATION', data.city);
                toast.success(`Lokasi terdeteksi: ${data.city}`);
            }
        } catch (e) {
            toast.error("Gagal mendeteksi lokasi.");
        } finally {
            setDetectingLocation(false);
        }
    };

    const handleSourceChange = (id) => {
        setSelectedContextId(id);
        const doc = sourceData.find(d => d.id === id);
        if (doc) {
            setSubject(doc.subject || '');
            setGradeLevel(doc.gradeLevel || doc.grade || '');
            setTopic(doc.materi || doc.topic || '');

            // RPP is stored as a flat HTML string in `content` field.
            // We parse the "Materi Ajar" section from that HTML.
            const extractSectionFromHtml = (html, sectionHeader) => {
                if (!html) return null;
                // Normalize tags: convert li, p, br -> newlines before stripping
                const normalized = html
                    .replace(/<\/li>/gi, '\n')
                    .replace(/<\/p>/gi, '\n')
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<[^>]*>/g, '');

                const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);
                const startIdx = lines.findIndex(l => l.toLowerCase().includes(sectionHeader.toLowerCase()));
                if (startIdx === -1) return null;

                // Collect lines until the next major section header or signature block
                const sectionLines = [];
                const headerPrefixes = [
                    'langkah', 'kegiatan pembelajaran', 'asesmen', 'penilaian', 'penutup',
                    'media', 'sarana', 'sumber belajar', 'refleksi', 'pengayaan', 'remedial',
                    'glosarium', 'daftar pustaka', 'lampiran'
                ];

                for (let i = startIdx + 1; i < lines.length; i++) {
                    const lineLower = lines[i].toLowerCase();

                    // Stop conditions:
                    // 1. Line starts with a header prefix (e.g. "Glosarium", "C. Penilaian")
                    const isHeaderPrefix = headerPrefixes.some(k => lineLower.startsWith(k) || lineLower.match(new RegExp(`^[0-9a-z]\\.\\s*${k}`)));
                    // 2. Line looks like a markdown header of a stop section: "### 4. GLOSARIUM"
                    const isMarkdownHeader = /^#*\s*\d*\.?\s*(glosarium|daftar pustaka|lampiran|asesmen|penilaian|refleksi|langkah)/.test(lineLower);
                    // 3. Signature block markers
                    const isSignatureBlock = lineLower.includes('...........') || lineLower.includes('mengetahui') || lineLower.includes('kepala sekolah') || lineLower.startsWith('nip.') || lineLower.includes('| mengetahui,');

                    if (isHeaderPrefix || isMarkdownHeader || isSignatureBlock) break;

                    sectionLines.push(lines[i]);
                    if (sectionLines.length >= 60) break; // Limit length to avoid massive prompt
                }
                return sectionLines.join('\n').trim() || null;
            };

            const rppContent = doc.content || '';
            const materiAjar = extractSectionFromHtml(rppContent, 'Materi Ajar');

            const summary = [
                `Materi Pokok: ${doc.topic || doc.materi || '-'}`,
                `Kompetensi Dasar (KD/TP): ${doc.kd || doc.tp || '-'}`,
                materiAjar ? `\nMateri Ajar Mendetail:\n${materiAjar}` : ''
            ].filter(Boolean).join('\n');

            setContextContent(summary);
        }
    };

    const updateTypeCount = (typeId, count) => {
        setTypeCounts(prev => ({ ...prev, [typeId]: parseInt(count) || 0 }));
    };

    const handleGenerate = async () => {
        if (!topic) return toast.error("Topik harus diisi!");
        const total = Object.values(typeCounts).reduce((sum, c) => sum + (c || 0), 0);
        if (total === 0) return toast.error("Tentukan jumlah soal!");

        setGenerating(true);
        setQuizResult(null);
        setGenerationProgress({ stage: 'starting', message: 'Memulai proses...', percentage: 5 });

        try {
            let result;
            if (sourceType === 'image' && imageFile) {
                result = await generateQuizFromImage(imageFile, total, gradeLevel, subject, topic, setGenerationProgress);
            } else {
                result = await generateAdvancedQuiz({
                    topic,
                    context: contextContent,
                    gradeLevel,
                    subject,
                    totalSoal: total,
                    typeCounts,
                    difficulty,
                    onProgress: (p) => setGenerationProgress(p)
                });
            }

            if (result && result.questions) {
                setQuizResult(result);
                toast.success("Kuis berhasil dibuat!");
            }
        } catch (error) {
            console.error("Gen Error:", error);
            const errType = error.message?.includes('quota') ? 'quota' :
                error.message?.includes('API key') ? 'apikey' : 'generic';
            setErrorModal({
                isOpen: true,
                title: "Gagal Meracik Soal",
                message: error.message || "Terjadi kesalahan sistem.",
                type: errType
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveQuiz = async () => {
        if (!quizResult || !auth.currentUser) return;
        setIsSaving(true);
        try {
            await addDoc(collection(db, 'quizzes'), {
                userId: auth.currentUser.uid,
                topic,
                subject,
                gradeLevel,
                quiz: quizResult,
                context_semester: activeSemester,
                createdAt: serverTimestamp()
            });
            toast.success("Kuis disimpan ke riwayat!");
            fetchQuizHistory();
        } catch (e) {
            toast.error("Gagal menyimpan kuis.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteQuiz = async (e, id) => {
        e.stopPropagation();
        setConfirmModal({
            isOpen: true,
            title: "Hapus Kuis?",
            message: "Riwayat kuis ini akan dihapus permanen.",
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'quizzes', id));
                    toast.success("Kuis dihapus.");
                    fetchQuizHistory();
                } catch (e) { toast.error("Gagal menghapus."); }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const getIconForType = (id) => {
        switch (id) {
            case 'pg': return <CircleDot size={16} />;
            case 'pg_complex': return <CheckSquare size={16} />;
            case 'true_false': return <ToggleLeft size={16} />;
            case 'matching': return <ArrowRightLeft size={16} />;
            case 'short_answer': return <Edit3 size={16} />;
            case 'essay': return <AlignLeft size={16} />;
            case 'pg_matrix': return <Grid size={16} />;
            case 'sequencing': return <ListOrdered size={16} />;
            default: return <BrainCircuit size={16} />;
        }
    };

    const QUESTION_TYPES = [
        ...BSKAP_DATA.standards.assessment_item_types,
        { id: 'pg_matrix', name: 'PG Kompleks Tabel' },
        { id: 'sequencing', name: 'Urutan' }
    ].map(t => ({
        id: t.id,
        label: t.id === 'pg_matrix' ? 'PG Kompleks Tabel' : t.name,
        description: t.description || t.name,
        icon: getIconForType(t.id)
    }));

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                    <BrainCircuit className="text-blue-600" />
                    Generator Kuis AI <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full border border-blue-200">Advanced</span>
                </h1>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800 w-fit">
                    <Sparkles size={12} /> Powered by BSKAP 2025 Intel Engine
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-4 order-last lg:order-first">
                    <QuizHistory
                        savedQuizzes={savedQuizzes}
                        loadingHistory={loadingHistory}
                        activeSemester={activeSemester}
                        onSelectQuiz={(result, meta) => {
                            setQuizResult(result);
                            setSubject(meta.subject);
                            setGradeLevel(meta.gradeLevel);
                            setTopic(meta.topic);
                        }}
                        onDeleteQuiz={handleDeleteQuiz}
                    />
                </div>

                <div className="lg:col-span-3 space-y-6">
                    <QuizForm
                        sourceType={sourceType} setSourceType={setSourceType}
                        sourceData={sourceData} loading={loading}
                        selectedContextId={selectedContextId} handleSourceChange={handleSourceChange}
                        subject={subject} setSubject={setSubject} subjects={subjects}
                        gradeLevel={gradeLevel} setGradeLevel={setGradeLevel} classes={classes}
                        topic={topic} setTopic={setTopic}
                        signingLocation={signingLocation} setSigningLocation={setSigningLocation}
                        handleDetectLocation={handleDetectLocation} detectingLocation={detectingLocation}
                        previewUrl={previewUrl} setPreviewUrl={setPreviewUrl} setImageFile={setImageFile}
                        contextContent={contextContent} setContextContent={setContextContent}
                        difficulty={difficulty} setDifficulty={setDifficulty}
                        typeCounts={typeCounts} updateTypeCount={updateTypeCount}
                        handleGenerate={handleGenerate} generating={generating}
                        generationProgress={generationProgress}
                        QUESTION_TYPES={QUESTION_TYPES}
                    />

                    <QuizResults
                        quizResult={quizResult}
                        isSaving={isSaving}
                        onSave={handleSaveQuiz}
                        onExportWord={() => QuizExportUtils.exportWord({ quizResult, subject, gradeLevel, topic, userProfile, signingLocation })}
                        onExportPDF={() => QuizExportUtils.exportPDF({ quizResult, subject, gradeLevel, topic, userProfile, signingLocation })}
                        onExportKartuSoalWord={() => QuizExportUtils.exportKartuSoalWord({ quizResult, topic, subject, gradeLevel, userProfile, signingLocation })}
                        onExportKartuSoalPDF={() => QuizExportUtils.exportKartuSoalPDF({ quizResult, topic, subject, gradeLevel, userProfile, signingLocation })}
                        onExportKisiKisiWord={() => QuizExportUtils.exportKisiKisiWord({ quizResult, topic, subject, gradeLevel, userProfile, activeSemester, signingLocation })}
                        onExportKisiKisiPDF={() => QuizExportUtils.exportKisiKisiPDF({ quizResult, topic, subject, gradeLevel, userProfile, activeSemester, signingLocation })}
                    />
                </div>
            </div>

            {confirmModal.isOpen && (
                <Modal onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
                    <div className="text-center p-4">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4 text-red-600">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold dark:text-white mb-2">{confirmModal.title}</h3>
                        <p className="text-gray-500 mb-6">{confirmModal.message}</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="px-6 py-2 bg-gray-100 rounded-xl">Batal</button>
                            <button onClick={confirmModal.onConfirm} className="px-6 py-2 bg-red-600 text-white rounded-xl">Hapus</button>
                        </div>
                    </div>
                </Modal>
            )}

            {errorModal.isOpen && (
                <Modal onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}>
                    <div className="text-center p-4">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mb-4 text-orange-600">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold dark:text-white mb-2">{errorModal.title}</h3>
                        <p className="text-gray-500 mb-6">{errorModal.message}</p>
                        <button onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl">Tutup</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default QuizGeneratorPage;
