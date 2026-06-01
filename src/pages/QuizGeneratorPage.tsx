import React, { useState, useEffect } from 'react';
import { useSettings } from '../utils/SettingsContext';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import {
    BrainCircuit, Sparkles, Trash2, AlertTriangle, Key, RefreshCw, Loader2,
    CircleDot, CheckSquare, ToggleLeft, ArrowRightLeft, AlignLeft, Grid, ListOrdered, Edit3
} from 'lucide-react';
import { generateAdvancedQuiz, generateQuizFromImage } from '../utils/gemini';
import { BSKAP_DATA } from '../utils/bskapData';
import toast from 'react-hot-toast';

import Modal from '../components/Modal';
import QuizHistory from '../components/quiz/QuizHistory';
import QuizForm from '../components/quiz/QuizForm';
import QuizResults from '../components/quiz/QuizResults';
import * as QuizExportUtils from '../utils/quizExportUtils';
import { useAI } from '../utils/AIContext';
import { useGeneratorHistory, useProgressSimulation } from '../hooks/useGeneratorHistory';

interface SubjectItem {
  id: string;
  name: string;
}

interface SourceDoc {
  id: string;
  subject?: string;
  gradeLevel?: string;
  grade?: string;
  materi?: string;
  topic?: string;
  content?: string;
  kd?: string;
  tp?: string;
}

interface ProgressInfo {
  message: string;
  percentage: number;
  stage: string;
}

interface GenerationContext {
  onProgress: (msg: string) => void;
}

interface QuizQuestionType {
  type: string;
  question: string;
  stimulus?: string;
  image_hint?: string;
  indicator?: string;
  cognitive_level?: string;
  options?: string[];
  left_side?: string[];
  right_side?: string[];
  rows?: string[];
  columns?: string[];
  statements?: Array<{ text: string }>;
  items?: string[];
  explanation?: string;
  competency?: string;
  answer?: string;
  correct_answer?: string;
  pairs?: Array<{ left: string; right: string }>;
  
  // Visualization support (Phase 1)
  visualization?: {
    type: 'chart' | 'diagram' | 'image';
    config: Record<string, unknown>;
  };
}

interface QuizDataType {
  questions: QuizQuestionType[];
}

const QuizGeneratorPage: React.FC = () => {
    const { user } = useAuth();
    const { activeSemester, academicYear, geminiModel } = useSettings();
    const { tasks, startGeneration } = useAI();

    const {
        history: savedQuizzes,
        loadingHistory,
        classes,
        userProfile,
        deleteHistoryItem
    } = useGeneratorHistory('quizzes');

    const [loading, setLoading] = useState(false);
    const aiTask = tasks.quiz || { status: 'idle', progress: '', result: '', params: null };
    const generating = aiTask.status === 'loading';

    const { progress: generationProgress, setProgress: setGenerationProgress } = useProgressSimulation(generating);

    // Form State
    const [sourceType, setSourceType] = useState('rpp');
    const [sourceData, setSourceData] = useState<SourceDoc[]>([]);
    const [selectedContextId, setSelectedContextId] = useState('');
    const [contextContent, setContextContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [subject, setSubject] = useState('');
    const [gradeLevel, setGradeLevel] = useState('');
    const [topic, setTopic] = useState('');
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);

    // Configuration State
    const [typeCounts, setTypeCounts] = useState<Record<string, number>>({ pg: 10 });
    const [difficulty, setDifficulty] = useState('Sedang');
    const [stimulusMode, setStimulusMode] = useState('auto');

    // Result State
    const [quizResult, setQuizResult] = useState<QuizDataType | null>(typeof aiTask.result === 'object' && aiTask.result !== null ? aiTask.result as unknown as QuizDataType : null);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: (() => void) | null;
    }>({ isOpen: false, title: '', message: '', onConfirm: null });
    const [signingLocation, setSigningLocation] = useState('Jakarta');
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', type: '' });

    useEffect(() => {
        const fetchMasters = async () => {
            if (!user) return;
            try {
                const sSnap = await getDocs(query(collection(db, 'subjects'), where('userId', '==', user.uid)));
                setSubjects(sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubjectItem)).sort((a, b) => a.name.localeCompare(b.name)));

                if (aiTask.params?.topic) setTopic(String(aiTask.params.topic));
                if (aiTask.params?.subject) setSubject(String(aiTask.params.subject));
            } catch (error) {
                console.error("Error fetching masters:", error);
            }
        };
        fetchMasters();

        const savedLoc = localStorage.getItem('SIGNING_LOCATION');
        if (savedLoc) setSigningLocation(savedLoc);
    }, [aiTask.params, user]);

    const handleDetectLocation = async () => {
        setDetectingLocation(true);
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            if (data.city) {
                setSigningLocation(data.city);
                localStorage.setItem('SIGNING_LOCATION', data.city);
                toast.success(`Lokasi terdeteksi: ${data.city}`);
            }
        } catch {
            toast.error("Gagal mendeteksi lokasi.");
        } finally {
            setDetectingLocation(false);
        }
    };

    const handleSourceChange = (id: string) => {
        setSelectedContextId(id);
        const foundDoc = sourceData.find(d => d.id === id);
        if (foundDoc) {
            setSubject(foundDoc.subject || '');
            setGradeLevel(foundDoc.gradeLevel || foundDoc.grade || '');
            setTopic(foundDoc.materi || foundDoc.topic || '');

            const extractSectionFromHtml = (html: string, sectionHeader: string) => {
                if (!html) return null;
                const normalized = html
                    .replace(/<\/li>/gi, '\n')
                    .replace(/<\/p>/gi, '\n')
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<[^>]*>/g, '');

                const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);
                const startIdx = lines.findIndex(l => l.toLowerCase().includes(sectionHeader.toLowerCase()));
                if (startIdx === -1) return null;

                const sectionLines: string[] = [];
                const headerPrefixes = [
                    'langkah', 'kegiatan pembelajaran', 'asesmen', 'penilaian', 'penutup',
                    'media', 'sarana', 'sumber belajar', 'refleksi', 'pengayaan', 'remedial',
                    'glosarium', 'daftar pustaka', 'lampiran'
                ];

                for (let i = startIdx + 1; i < lines.length; i++) {
                    const lineLower = lines[i].toLowerCase();
                    const isHeaderPrefix = headerPrefixes.some(k => lineLower.startsWith(k) || lineLower.match(new RegExp(`^[0-9a-z]\\.\\s*${k}`)));
                    const isMarkdownHeader = /^#*\s*\d*\.?\s*(glosarium|daftar pustaka|lampiran|asesmen|penilaian|refleksi|langkah)/.test(lineLower);
                    const isSignatureBlock = lineLower.includes('...........') || lineLower.includes('mengetahui') || lineLower.includes('kepala sekolah') || lineLower.startsWith('nip.') || lineLower.includes('| mengetahui,');

                    if (isHeaderPrefix || isMarkdownHeader || isSignatureBlock) break;

                    sectionLines.push(lines[i]);
                    if (sectionLines.length >= 60) break;
                }
                return sectionLines.join('\n').trim() || null;
            };

            const rppContent = foundDoc.content || '';
            const materiAjar = extractSectionFromHtml(rppContent, 'Materi Ajar');

            const summary = [
                `Materi Pokok: ${foundDoc.topic || foundDoc.materi || '-'}`,
                `Kompetensi Dasar (KD/TP): ${foundDoc.kd || foundDoc.tp || '-'}`,
                materiAjar ? `\nMateri Ajar Mendetail:\n${materiAjar}` : ''
            ].filter(Boolean).join('\n');

            setContextContent(summary);
        }
    };

    const updateTypeCount = (typeId: string, count: string) => {
        setTypeCounts(prev => ({ ...prev, [typeId]: parseInt(count) || 0 }));
    };

    const handleGenerate = async () => {
        if (!topic) return toast.error("Topik harus diisi!");
        const total = Object.values(typeCounts).reduce((sum, c) => sum + (c || 0), 0);
        if (total === 0) return toast.error("Tentukan jumlah soal!");

        setQuizResult(null);
        setGenerationProgress({ stage: 'starting', message: 'Memulai proses...', percentage: 5 });

        try {
            await startGeneration('quiz', async (context: GenerationContext) => {
                let result;
                if (sourceType === 'image' && imageFile) {
                    const base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(imageFile);
                    });

                    result = await generateQuizFromImage({
                        imageBase64: base64,
                        count: total,
                        gradeLevel,
                        subject,
                        topic,
                        modelName: geminiModel,
                        onProgress: (p: ProgressInfo) => {
                            setGenerationProgress(p);
                            context.onProgress(p.message);
                        }
                    });
                } else {
                    result = await generateAdvancedQuiz({
                        topic,
                        context: contextContent,
                        gradeLevel,
                        subject,
                        typeCounts,
                        difficulty,
                        modelName: geminiModel,
                        stimulusMode,
                        onProgress: (p: ProgressInfo) => {
                            setGenerationProgress(p);
                            context.onProgress(p.message);
                        }
                    });
                }
                return result;
            }, { topic, subject });

        } catch (error) {
            console.error("Generate error:", error);
        }
    };

    useEffect(() => {
        if (aiTask.status === 'success' && aiTask.result) {
            setQuizResult(typeof aiTask.result === 'object' && aiTask.result !== null ? aiTask.result as unknown as QuizDataType : null);
        }
        if (aiTask.progress) {
            setGenerationProgress(prev => ({ ...prev, message: aiTask.progress }));
        }
    }, [aiTask.status, aiTask.result, aiTask.progress, setGenerationProgress]);

    useEffect(() => {
        const fetchSources = async () => {
            if (!user) return;
            setLoading(true);
            try {
                let collectionName = sourceType === 'rpp' ? 'lessonPlans' : 'teachingPrograms';
                let q = query(
                    collection(db, collectionName),
                    where('userId', '==', user.uid),
                    where('academicYear', '==', academicYear)
                );

                if (sourceType === 'promes') {
                    q = query(q, where('type', '!=', 'atp_document'));
                }

                const snap = await getDocs(q);
                setSourceData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching sources:", error);
            } finally {
                setLoading(false);
            }
        };

        if (sourceType !== 'manual' && sourceType !== 'image') fetchSources();
    }, [sourceType, academicYear, user]);

    const handleSaveQuiz = async () => {
        if (!quizResult || !user) return;
        setIsSaving(true);
        try {
            await addDoc(collection(db, 'quizzes'), {
                userId: user.uid,
                topic,
                subject,
                gradeLevel,
                quiz: quizResult,
                context_semester: activeSemester,
                createdAt: serverTimestamp()
            });
            toast.success("Kuis disimpan ke riwayat!");
        } catch {
            toast.error("Gagal menyimpan kuis.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteQuiz = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setConfirmModal({
            isOpen: true,
            title: "Hapus Kuis?",
            message: "Riwayat kuis ini akan dihapus permanen.",
            onConfirm: async () => {
                const success = await deleteHistoryItem(id);
                if (success) {
                    setConfirmModal(prev => ({ ...prev, isOpen: false, onConfirm: null }));
                }
            }
        });
    };

    const getIconForType = (id: string) => {
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

    interface AssessmentItem {
      id: string;
      name: string;
      description?: string;
    }

    const QUESTION_TYPES = [
        ...(BSKAP_DATA.standards.assessment_item_types as AssessmentItem[]),
        { id: 'pg_matrix', name: 'PG Kompleks Tabel' },
        { id: 'sequencing', name: 'Urutan' }
    ].map((t: AssessmentItem) => ({
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
                        onSelectQuiz={(quiz: Record<string, unknown>, info: { subject: string; gradeLevel: string; topic: string }) => {
                            setQuizResult(quiz as unknown as QuizDataType);
                            setSubject(info.subject);
                            setGradeLevel(info.gradeLevel);
                            setTopic(info.topic);
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
                        difficulty={parseInt(difficulty) || 0} setDifficulty={(diff: number) => setDifficulty(String(diff))}
                        stimulusMode={stimulusMode}
                        setStimulusMode={setStimulusMode}
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
                <Modal onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false, onConfirm: null }))}>
                    <div className="text-center p-4">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4 text-red-600">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold dark:text-white mb-2">{confirmModal.title}</h3>
                        <p className="text-gray-500 mb-6">{confirmModal.message}</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false, onConfirm: null }))} className="px-6 py-2 bg-gray-100 rounded-xl">Batal</button>
                            <button onClick={confirmModal.onConfirm || undefined} className="px-6 py-2 bg-red-600 text-white rounded-xl">Hapus</button>
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


