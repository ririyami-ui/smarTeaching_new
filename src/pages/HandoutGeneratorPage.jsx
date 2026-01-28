import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, addDoc, deleteDoc, serverTimestamp, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; // Use native listener
import { generateHandout } from '../utils/gemini';
import BSKAP_DATA from '../utils/bskap_2025_intel.json';
import { BookOpen, Save, Download, Printer, Wand2, ArrowLeft, Search, History, Trash2, Clock, X, Eye, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { saveAs } from 'file-saver';
import { asBlob } from 'html-docx-js-typescript';
import Modal from '../components/Modal';

const HandoutGeneratorPage = () => {
    const [user, setUser] = useState(auth.currentUser);
    const navigate = useNavigate();
    const [userProfile, setUserProfile] = useState(null);

    // Data Sources
    const [levels, setLevels] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [savedRPPs, setSavedRPPs] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // Form States
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [topic, setTopic] = useState('');
    const [selectedRPPId, setSelectedRPPId] = useState(''); // To track selected RPP

    // Generation States
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');

    // History & Saving States
    const [savedHandouts, setSavedHandouts] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    // Prepopulate from URL if coming from Schedule
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const qGrade = params.get('grade');
        const qSubject = params.get('subject');
        const qTopic = params.get('topic');

        if (qGrade) setSelectedGrade(qGrade);
        if (qSubject) setSelectedSubject(qSubject);
        if (qTopic) {
            setTopic(qTopic);
            setSelectedRPPId('manual'); // Direct to manual if pre-filled
        }
    }, [levels, subjects]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Subscribe to History
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'handouts'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setSavedHandouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
            console.error("History subscription error:", error);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!user) return;
            setLoadingData(true);
            try {
                const classesQuery = query(collection(db, 'classes'), where('userId', '==', user.uid));
                const subjectsQuery = query(collection(db, 'subjects'), where('userId', '==', user.uid));

                const [classesSnap, subjectsSnap] = await Promise.all([
                    getDocs(classesQuery),
                    getDocs(subjectsQuery)
                ]);

                // Process Levels (Grades)
                const uniqueLevels = [...new Set(classesSnap.docs.map(doc => doc.data().level))].sort();
                setLevels(uniqueLevels);
                if (uniqueLevels.length > 0) setSelectedGrade(uniqueLevels[0]);

                // Process Subjects
                const fetchedSubjects = subjectsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name })).sort((a, b) => a.name.localeCompare(b.name));
                setSubjects(fetchedSubjects);
                if (fetchedSubjects.length > 0) setSelectedSubject(fetchedSubjects[0].id);

                // Fetch User Profile (for Teacher Name)
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setUserProfile(userDoc.data());
                }

                // Fetch Saved RPPs for Topic Selection
                const rppQuery = query(
                    collection(db, 'lessonPlans'),
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'asc')
                );
                const rppSnapshot = await getDocs(rppQuery);
                const rpps = rppSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setSavedRPPs(rpps);

            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Gagal memuat data aplikasi");
            } finally {
                setLoadingData(false);
            }
        };

        fetchInitialData();
    }, [user]);

    // Handle RPP Selection
    const handleRPPSelect = (rppId) => {
        setSelectedRPPId(rppId);
        if (rppId === 'manual' || !rppId) {
            setTopic('');
            return;
        }

        const selectedRPP = savedRPPs.find(rpp => rpp.id === rppId);
        if (selectedRPP) {
            setTopic(selectedRPP.topic || selectedRPP.materi || '');
            // Auto match subject and grade if they exist in our lists
            if (selectedRPP.subjectId || selectedRPP.subject) {
                const rppSubId = selectedRPP.subjectId;
                const rppSubName = selectedRPP.subject;
                const subMatch = subjects.find(s => s.id === rppSubId || s.name === rppSubName);
                if (subMatch) setSelectedSubject(subMatch.id);
            }
            // Strict or loose match for grade
            if (selectedRPP.class || selectedRPP.grade) {
                const rppLevel = String(selectedRPP.class || selectedRPP.grade);
                if (levels.includes(rppLevel)) setSelectedGrade(rppLevel);
            }
            toast.success("Topik dimuat dari RPP");
        }
    };

    const handleGenerate = async () => {
        if (!topic) {
            toast.error("Mohon isi atau pilih topik materi terlebih dahulu");
            return;
        }

        setIsGenerating(true);
        try {
            const subjectObj = subjects.find(s => s.id === selectedSubject);
            const subjectName = subjectObj?.name || selectedSubject;

            const result = await generateHandout({
                subject: subjectName,
                gradeLevel: selectedGrade,
                materi: topic,
                teacherName: userProfile?.name || 'Guru Smart Teaching',
                teacherTitle: userProfile?.title || 'Bapak/Ibu',
                modelName: userProfile?.geminiModel // Pass user's preferred model if set
            });
            setGeneratedContent(result);
            toast.success("Bahan Ajar berhasil dibuat!");
        } catch (error) {
            console.error(error);
            toast.error("Gagal membuat bahan ajar: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadDocx = async () => {
        if (!generatedContent) return;

        const contentHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Calibri', sans-serif; line-height: 1.5; }
                    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
                    h2 { color: #1e40af; margin-top: 20px; }
                    blockquote { background: #f3f4f6; border-left: 5px solid #2563eb; padding: 10px; margin: 10px 0; }
                    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; }
                    th { background-color: #f3f4f6; }
                </style>
            </head>
            <body>
                ${document.getElementById('handout-preview').innerHTML}
            </body>
            </html>
        `;

        try {
            const blob = await asBlob(contentHtml);
            saveAs(blob, `Bahan Ajar - ${topic}.docx`);
            toast.success("Dokumen Word berhasil diunduh");
        } catch (error) {
            console.error(error);
            toast.error("Gagal mengunduh dokumen");
        }
    };

    const handleSave = async () => {
        if (!generatedContent || !topic) return;

        // Check for duplicates
        const duplicate = savedHandouts.find(item =>
            item.topic?.toLowerCase().trim() === topic.toLowerCase().trim() &&
            item.subject === selectedSubject &&
            item.gradeLevel === selectedGrade
        );

        if (duplicate) {
            setConfirmModal({
                isOpen: true,
                title: 'Data Duplikat',
                message: `Sudah ada Bahan Ajar dengan topik "${topic}" untuk ${selectedSubject} Kelas ${selectedGrade}. Apakah Anda yakin ingin menyimpan duplikat?`,
                onConfirm: async () => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    await executeSave();
                }
            });
            return;
        }

        await executeSave();
    };

    const executeSave = async () => {
        setIsSaving(true);
        try {
            const subjectObj = subjects.find(s => s.id === selectedSubject);
            const subjectName = subjectObj?.name || selectedSubject;

            await addDoc(collection(db, 'handouts'), {
                userId: user.uid,
                topic: topic,
                subjectId: selectedSubject,
                subject: subjectName,
                gradeLevel: selectedGrade,
                content: generatedContent,
                createdAt: serverTimestamp(),
                teacherName: userProfile?.name || 'Guru',
                teacherTitle: userProfile?.title || 'Bapak/Ibu',
                school: userProfile?.school || ''
            });
            toast.success("Bahan Ajar berhasil disimpan ke Riwayat!");
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Gagal menyimpan.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Hapus Riwayat',
            message: 'Apakah Anda yakin ingin menghapus item riwayat bahan ajar ini?',
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'handouts', id));
                    toast.success("Item dihapus.");
                } catch (error) {
                    toast.error("Gagal menghapus.");
                } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleLoad = (item) => {
        setGeneratedContent(item.content);
        setTopic(item.topic);
        setSelectedSubject(item.subjectId || item.subject || '');
        setSelectedGrade(item.gradeLevel || '');
        setShowHistory(false);
        toast.success("Bahan Ajar dimuat kembali.");
    };

    return (
        <div className="flex h-screen bg-bg-light dark:bg-bg-dark font-poppins">
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-bg-light dark:bg-bg-dark p-6">
                    <div className="max-w-7xl mx-auto space-y-6">

                        {/* Header */}
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
                                    <BookOpen className="w-8 h-8 text-primary-light" />
                                    Generator Bahan Ajar (Handout)
                                </h1>
                                <p className="text-text-muted-light dark:text-text-muted-dark mt-1">
                                    Buat modul belajar visual dan menarik untuk siswa dalam sekejap.
                                </p>
                                <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded border border-blue-100 dark:border-blue-800 w-fit">
                                    <Sparkles size={12} /> Powered by BSKAP 2025 Intel Engine
                                </div>
                            </div>
                            <button
                                onClick={() => setShowHistory(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
                            >
                                <History size={18} />
                                Riwayat
                            </button>
                        </div>

                        {/* Input Section */}
                        <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg p-6 border border-border-light dark:border-border-dark">
                            <div className="space-y-6">
                                {/* Top Row: Filters */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* 1. Kelas */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                                            Pilih Kelas
                                        </label>
                                        <select
                                            value={selectedGrade}
                                            onChange={(e) => {
                                                setSelectedGrade(e.target.value);
                                                setSelectedRPPId('');
                                                setTopic('');
                                            }}
                                            className="w-full px-4 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:ring-2 focus:ring-primary-light"
                                        >
                                            {levels.length > 0 ? (
                                                levels.map((level, idx) => (
                                                    <option key={idx} value={level}>{level}</option>
                                                ))
                                            ) : (
                                                <option disabled>Tidak ada data kelas</option>
                                            )}
                                        </select>
                                    </div>

                                    {/* 2. Mata Pelajaran */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                                            Mata Pelajaran
                                        </label>
                                        <select
                                            value={selectedSubject}
                                            onChange={(e) => {
                                                setSelectedSubject(e.target.value);
                                                setSelectedRPPId('');
                                                setTopic('');
                                            }}
                                            className="w-full px-4 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:ring-2 focus:ring-primary-light"
                                        >
                                            {subjects.length > 0 ? (
                                                subjects.map((sub, idx) => (
                                                    <option key={idx} value={sub.id}>{sub.name}</option>
                                                ))
                                            ) : (
                                                <option disabled>Tidak ada data mapel</option>
                                            )}
                                        </select>
                                    </div>
                                </div>

                                {/* Middle Row: RPP Selection (Filtered) */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                                        Pilih Topik dari RPP (Sesuai Kelas & Mapel)
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedRPPId}
                                            onChange={(e) => handleRPPSelect(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:ring-2 focus:ring-primary-light appearance-none"
                                        >
                                            <option value="">-- Pilih Topik dari RPP Tersimpan --</option>
                                            {savedRPPs
                                                .filter(rpp => {
                                                    // Filter by Grade (Field is primarily gradeLevel in LessonPlanPage)
                                                    const rppGrade = String(rpp.gradeLevel || rpp.class || rpp.grade || '').trim();
                                                    const selectedGradeStr = String(selectedGrade).trim();

                                                    // Loose equality to handle "7" vs "Kelas 7"
                                                    const gradeMatch = rppGrade === selectedGradeStr || rppGrade.includes(selectedGradeStr) || selectedGradeStr.includes(rppGrade);

                                                    // Filter by Subject (Case insensitive safe match)
                                                    const rppSubjectId = rpp.subjectId;
                                                    const rppSubjectName = (rpp.subject || '').toLowerCase().trim();
                                                    const selectedSubjectObj = subjects.find(s => s.id === selectedSubject);
                                                    const subjectMatch = rppSubjectId === selectedSubject || rppSubjectName === selectedSubjectObj?.name?.toLowerCase().trim();

                                                    return gradeMatch && subjectMatch;
                                                })
                                                .map((rpp) => (
                                                    <option key={rpp.id} value={rpp.id}>
                                                        {rpp.topic || rpp.materi}
                                                    </option>
                                                ))}
                                            <option value="manual">Manual Input (Topik Baru)</option>
                                        </select>
                                        <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        *Hanya menampilkan RPP yang cocok dengan Kelas & Mapel yang dipilih di atas.
                                    </p>
                                </div>

                                {/* Bottom Row: Trigger Button */}
                                <div>
                                    {selectedRPPId === 'manual' && (
                                        <div className="mb-4 animate-fade-in-down">
                                            <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                                                Topik / Materi Manual
                                            </label>
                                            <input
                                                type="text"
                                                value={topic}
                                                onChange={(e) => setTopic(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:ring-2 focus:ring-primary-light"
                                                placeholder="Ketik topik materi..."
                                            />
                                        </div>
                                    )}

                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating || !topic}
                                        className="w-full flex justify-center items-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg transition-all disabled:opacity-50 font-bold text-lg"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                Sedang Menulis Modul...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-5 h-5" />
                                                Buat Modul Bahan Ajar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Result Section */}
                        {generatedContent && (
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg p-6 border border-border-light dark:border-border-dark animate-fade-in-up">
                                <div className="flex justify-between items-center mb-6 border-b border-border-light dark:border-border-dark pb-4">
                                    <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
                                        Preview Bahan Ajar
                                    </h2>
                                    <div className="flex gap-3">
                                        {/* Save Button */}
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                        >
                                            <Save size={16} />
                                            {isSaving ? 'Menyimpan...' : 'Simpan'}
                                        </button>
                                        <button
                                            onClick={handleDownloadDocx}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download Word
                                        </button>
                                    </div>
                                </div>

                                <div className="prose dark:prose-invert max-w-none bg-white p-8 rounded-lg shadow-sm border border-gray-100 min-h-[500px]" id="handout-preview">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeRaw]}
                                    >
                                        {generatedContent}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* History Modal */}
                    {showHistory && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <History size={20} className="text-blue-500" />
                                        Riwayat Bahan Ajar
                                    </h3>
                                    <button
                                        onClick={() => setShowHistory(false)}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {savedHandouts.length === 0 ? (
                                        <div className="text-center py-10 text-gray-500">
                                            Belum ada riwayat tersimpan.
                                        </div>
                                    ) : (
                                        savedHandouts.map((item) => (
                                            <div
                                                key={item.id}
                                                className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition-all group"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-gray-800 dark:text-white line-clamp-1">{item.topic}</h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                                                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">{item.subject}</span>
                                                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-semibold">Kelas {item.gradeLevel}</span>
                                                            <span className="flex items-center gap-1 text-xs">
                                                                <Clock size={12} />
                                                                {item.createdAt?.seconds
                                                                    ? new Date(item.createdAt.seconds * 1000).toLocaleDateString()
                                                                    : 'Baru saja'}
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleLoad(item)}
                                                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                                                            title="Buka kembali"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl text-center text-xs text-gray-500">
                                    Simpan konten terbaik Anda untuk digunakan kembali nanti.
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
            {confirmModal.isOpen && (
                <Modal onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
                    <div className="text-center">
                        <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ${confirmModal.title === 'Data Duplikat' ? 'bg-orange-100' : 'bg-red-100'}`}>
                            {confirmModal.title === 'Data Duplikat' ? (
                                <Wand2 className="h-8 w-8 text-orange-600" />
                            ) : (
                                <Trash2 className="h-8 w-8 text-red-600" />
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{confirmModal.title}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">{confirmModal.message}</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className={`px-6 py-2.5 text-white font-semibold rounded-xl transition shadow-lg ${confirmModal.title === 'Data Duplikat' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'} dark:shadow-none`}
                            >
                                {confirmModal.title === 'Data Duplikat' ? 'Simpan Duplikat' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default HandoutGeneratorPage;
