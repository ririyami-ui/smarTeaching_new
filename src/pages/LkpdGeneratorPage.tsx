import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { generateLKPDFromRPP } from '../utils/gemini';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { saveAs } from 'file-saver';
import { formatDate } from '../utils/dateUtils';
import { asBlob } from 'html-docx-js-typescript';
import { useSettings } from '../utils/SettingsContext';
import { useAI } from '../utils/AIContext';
import {
    Sparkles,
    Loader2,
    History,
    FileText,
    Download,
    ClipboardList,
    Search,
    Trash2,
    Save,
    Clock
} from 'lucide-react';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';
import { useGeneratorHistory, useProgressSimulation } from '../hooks/useGeneratorHistory';
import { useAuth } from '../hooks/useAuth';

interface StyledSelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

const StyledSelect: React.FC<StyledSelectProps> = ({ label, value, onChange, children, disabled }) => (
    <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">{label}</label>
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                className="w-full p-3 pl-4 pr-10 appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {children}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
    </div>
);

interface RPPItem {
  id: string;
  topic?: string;
  materi?: string;
  subjectId?: string;
  subject?: string;
  class?: string;
  grade?: string;
  gradeLevel?: string;
  createdAt?: { toDate: () => Date; seconds?: number };
  content?: string;
  assessmentModel?: string;
}

interface LKPDItem {
  id: string;
  rppId?: string;
  rppTopic?: string;
  subject?: string;
  gradeLevel?: string;
  classId?: string;
  classRoom?: string;
  content?: string;
  createdAt?: { toDate: () => Date; seconds?: number };
}

const LkpdGeneratorPage: React.FC = () => {
    const { user } = useAuth();
    const { geminiModel, academicYear } = useSettings();
    const { tasks, startGeneration } = useAI();

    interface ClassItem {
      id: string;
      rombel: string;
      level: string;
    }

    // Context Hook
    const {
        history: savedLKPDs,
        loadingHistory,
        classes,
        userProfile,
        deleteHistoryItem
    } = useGeneratorHistory('lkpd_history') as unknown as {
      history: LKPDItem[];
      loadingHistory: boolean;
      classes: ClassItem[];
      userProfile: Record<string, unknown>;
      loadingProfile: boolean;
      deleteHistoryItem: (id: string) => Promise<boolean>;
    };

    // Data States
    const [savedRPPs, setSavedRPPs] = useState<RPPItem[]>([]);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: (() => void) | null }>({ isOpen: false, title: '', message: '', onConfirm: null });

    // Selection States
    const [selectedRPP, setSelectedRPP] = useState<RPPItem | null>(null);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [assessmentModel, setAssessmentModel] = useState<string>('Rubrik');
    const [filterSubject, setFilterSubject] = useState<string>('');

    // Generation States
    const aiTask = tasks.lkpd || { status: 'idle' };
    const isGenerating = aiTask.status === 'loading';
    const [lkpdContent, setLkpdContent] = useState<string>(typeof aiTask.result === 'string' ? aiTask.result : '');

    const { progress: generationProgress, setProgress: setGenerationProgress } = useProgressSimulation(isGenerating);

    // Signing Location
    const [signingLocation] = useState<string>(() => localStorage.getItem('SIGNING_LOCATION') || 'Jakarta');

    // Load RPP History
    useEffect(() => {
        if (!user) return;

        const rppQuery = query(
            collection(db, 'lessonPlans'),
            where('userId', '==', user.uid),
            where('academicYear', '==', academicYear)
        );

        const unsubRPP = onSnapshot(rppQuery, (snapshot) => {
            const rpps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RPPItem));
            const sortedRPPs = rpps.sort((a, b) => {
                const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return bTime - aTime;
            });
            setSavedRPPs(sortedRPPs);

            if (aiTask.params?.rppId) {
                const match = sortedRPPs.find(r => r.id === String(aiTask.params!.rppId));
                if (match) setSelectedRPP(match);
            }
        });

        return () => unsubRPP();
    }, [academicYear, user, aiTask.params]);

    // Restore selected class from context
    useEffect(() => {
        if (aiTask.params?.classId && classes.length > 0) {
            const match = classes.find((c: ClassItem) => c.id === String(aiTask.params!.classId));
            if (match) setSelectedClass(match.id);
        }
    }, [aiTask.params, classes]);

    const handleGenerateLKPD = async () => {
        if (!selectedRPP) return toast.error("Pilih RPP terlebih dahulu");
        if (!selectedClass) return toast.error("Pilih Kelas terlebih dahulu");
        if (!user) return toast.error("Pengguna belum login");

        try {
            await startGeneration('lkpd', async () => {
                // Fetch Students
                const studentsQuery = query(
                    collection(db, 'students'),
                    where('userId', '==', user!.uid),
                    where('classId', '==', selectedClass),
                    orderBy('name')
                );
                let snapshot = await getDocs(studentsQuery);

                if (snapshot.empty) {
                    const classObj = classes.find((c: ClassItem) => c.id === selectedClass);
                    if (classObj) {
                        const fallbackQ = query(
                            collection(db, 'students'),
                            where('userId', '==', user!.uid),
                            where('rombel', '==', classObj.rombel),
                            orderBy('name')
                        );
                        snapshot = await getDocs(fallbackQ);
                    }
                }

                const students = snapshot.docs.map(doc => doc.data());
                const studentNames = students.map(s => s.name).join('\n');

                return await generateLKPDFromRPP(selectedRPP.content || '', assessmentModel, geminiModel, studentNames);
            }, {
                rppId: selectedRPP.id,
                classId: selectedClass
            });

        } catch (error) {
            console.error("Generate error:", error);
        }
    };

    // Sync context result
    useEffect(() => {
        if (aiTask.status === 'success' && aiTask.result) {
            setLkpdContent(typeof aiTask.result === 'string' ? aiTask.result : '');
        }
        if (aiTask.progress) {
            setGenerationProgress((prev: { stage: string; message: string; percentage: number }) => ({ ...prev, message: aiTask.progress }));
        }
    }, [aiTask.status, aiTask.result, aiTask.progress, setGenerationProgress]);


    const handleDownloadDocx = async () => {
        const content = document.getElementById('lkpd-preview-content');
        if (!content) {
            toast.error("Belum ada konten LKPD untuk diunduh");
            return;
        }

        const contentHtml = content.innerHTML;
        const dateStr = formatDate(new Date());

        const htmlString = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #000; }
                    h1, h2, h3 { color: #000; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
                    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .page-break { page-break-before: always; }
                    .sig-table, .sig-table td { border: none !important; }
                </style>
            </head>
            <body>
                ${contentHtml}
                <table class="sig-table" style="margin-top: 50px; width: 100%; border: none;">
                    <tr>
                        <td align="center" style="border: none; width: 50%;">
                            Mengetahui,<br/>Kepala Sekolah
                            <br/><br/><br/><br/>
                            <strong>${userProfile.principalName || '.....................................'}</strong><br/>
                            NIP. ${userProfile.principalNip || '...................'}
                        </td>
                        <td align="center" style="border: none; width: 50%;">
                            ${signingLocation || 'Jakarta'}, ${dateStr}<br/>Guru Mata Pelajaran
                            <br/><br/><br/><br/>
                            <strong>${userProfile.name || '.....................................'}</strong><br/>
                            NIP. ${userProfile.nip || '...................'}
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        try {
            const converted = await asBlob(htmlString);
            const fileName = `LKPD-${selectedRPP?.gradeLevel || 'Kelas'}-${selectedClass || 'General'}.docx`;
            saveAs(converted, fileName);
            toast.success("LKPD sedang didownload (.docx)");
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Gagal membuat file Word");
        }
    };

    const handleSaveLKPD = async () => {
        if (!lkpdContent || !selectedRPP || !selectedClass || !user) return;
        setIsSaving(true);
        try {
            const classObj = classes.find((c: ClassItem) => c.id === selectedClass);

            await addDoc(collection(db, 'lkpd_history'), {
                userId: user.uid,
                rppId: selectedRPP.id,
                rppTopic: selectedRPP.topic,
                subject: selectedRPP.subject,
                gradeLevel: selectedRPP.gradeLevel,
                classId: selectedClass,
                classRoom: classObj?.rombel || selectedClass,
                content: lkpdContent,
                createdAt: serverTimestamp()
            });
            toast.success("LKPD berhasil disimpan!");
        } catch (error) {
            console.error("Error saving LKPD:", error);
            toast.error("Gagal menyimpan LKPD");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteLKPD = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Hapus Riwayat',
            message: 'Apakah Anda yakin ingin menghapus Riwayat LKPD ini?',
            onConfirm: async () => {
                const success = await deleteHistoryItem(id);
                if (success) {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleLoadLKPD = (lkpd: LKPDItem) => {
        setLkpdContent(lkpd.content || '');
        setSelectedClass(lkpd.classId || lkpd.classRoom || '');
        const rpp = savedRPPs.find(r => r.id === lkpd.rppId);
        if (rpp) setSelectedRPP(rpp);
    };

    return (
        <div className="max-w-[1500px] mx-auto px-4 py-4 lg:py-8 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 lg:mb-8 no-print">
                <div>
                    <h1 className="text-3xl font-extrabold text-purple-800 dark:text-purple-100 flex items-center gap-3">
                        <ClipboardList className="text-purple-600 animate-pulse" />
                        Generator LKPD
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Buat Lembar Kerja Peserta Didik (LKPD) otomatis dari RPP yang sudah ada.
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded border border-purple-100 dark:border-purple-800 w-fit">
                        <Sparkles size={12} /> Powered by BSKAP 2025 Intel Engine
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Controls */}
                <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-8 h-fit">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <Search size={20} className="text-purple-500" />
                            Konfigurasi
                        </h3>

                        {/* RPP Selection */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Pilih RPP Sumber</label>

                            {/* Subject Filter Dropdown */}
                            {savedRPPs.length > 0 && (
                                <select
                                    value={filterSubject}
                                    onChange={(e) => {
                                        setFilterSubject(e.target.value);
                                        setSelectedRPP(null); // Reset selection when filter changes
                                    }}
                                    className="w-full mb-3 p-2 text-xs bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg text-purple-700 dark:text-purple-300 font-bold focus:ring-1 focus:ring-purple-500 outline-none"
                                >
                                    <option value="">-- Semua Mata Pelajaran --</option>
                                    {Array.from(new Set(savedRPPs.map(r => r.subject).filter(Boolean))).sort().map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            )}

                            {loadingHistory ? (
                                <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="animate-spin" size={14} /> Memuat RPP...</div>
                            ) : (
                                <div className="max-h-60 overflow-y-auto border dark:border-gray-600 rounded-xl divide-y dark:divide-gray-700 overflow-hidden">
                                    {savedRPPs.length > 0 ? (
                                        savedRPPs
                                            .filter(r => !filterSubject || r.subject === filterSubject)
                                            .map((rpp, index) => (
                                                <button
                                                    key={rpp.id}
                                                    onClick={() => {
                                                        setSelectedRPP(rpp);
                                                        setSelectedClass('');
                                                        if (rpp.assessmentModel) {
                                                            setAssessmentModel(rpp.assessmentModel);
                                                            toast.success(`Model KKTP terdeteksi: ${rpp.assessmentModel}`);
                                                        }
                                                    }}
                                                    className={`w-full text-left p-3 text-sm transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/20 
                                                        ${selectedRPP?.id === rpp.id
                                                            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold'
                                                            : index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/20'} 
                                                        text-gray-600 dark:text-gray-400`}
                                                >
                                                    <div className="font-bold">{rpp.gradeLevel} - {rpp.subject}</div>
                                                    <div className="text-xs font-normal truncate">{rpp.topic}</div>
                                                </button>
                                            ))
                                    ) : (
                                        <div className="p-4 text-center text-xs text-gray-400">Belum ada RPP tersimpan. Silakan buat RPP dulu.</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Grade Level Display (Read Only) */}
                        {selectedRPP && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/45 rounded-xl border border-blue-100 dark:border-blue-900">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block mb-1">Terpilih:</span>
                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedRPP.gradeLevel} - {selectedRPP.subject}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{selectedRPP.topic}</div>
                            </div>
                        )}

                        {/* Class Selection */}
                        <StyledSelect
                            label="Pilih Kelas (Target)"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            disabled={!selectedRPP}
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {classes
                                .filter((c: ClassItem) => !selectedRPP || c.level == selectedRPP.gradeLevel)
                                .map((c: ClassItem) => <option key={c.id} value={c.id}>{c.rombel}</option>)
                            }
                        </StyledSelect>

                        <StyledSelect
                            label="Pendekatan Asesmen (KKTP)"
                            value={assessmentModel}
                            onChange={(e) => setAssessmentModel(e.target.value)}
                        >
                            <option value="Deskripsi Kriteria">Deskripsi Kriteria</option>
                            <option value="Rubrik">Rubrik</option>
                            <option value="Interval Nilai">Interval Nilai</option>
                        </StyledSelect>

                        <button
                            onClick={handleGenerateLKPD}
                            disabled={isGenerating || !selectedRPP || !selectedClass}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-200 dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                            {isGenerating ? 'Memproses...' : 'Buat LKPD'}
                        </button>

                        <ProgressBar
                            isGenerating={isGenerating}
                            stage={generationProgress.stage}
                            message={generationProgress.message}
                            percentage={generationProgress.percentage}
                        />

                    </div>

                    {/* History Section */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <History size={20} className="text-purple-500" />
                            Riwayat LKPD
                        </h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {loadingHistory ? (
                                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-300" /></div>
                            ) : savedLKPDs.length > 0 ? (
                                savedLKPDs.map((item: LKPDItem) => (
                                    <div key={item.id} className="group relative bg-gray-50 dark:bg-gray-950/45 p-3 rounded-xl border dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-800 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div className="cursor-pointer flex-1" onClick={() => handleLoadLKPD(item)}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{item.gradeLevel} - {item.classRoom}</span>
                                                    <span className="text-[10px] text-gray-400">{item.createdAt?.toDate ? formatDate(item.createdAt.toDate()) : 'N/A'}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">{item.rppTopic || 'Topik tidak tersedia'}</p>
                                            </div>
                                            <button onClick={() => handleDeleteLKPD(item.id)} className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-xs text-gray-400 py-4">Belum ada riwayat tersimpan.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="lg:col-span-3">
                    {lkpdContent ? (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col h-full min-h-[600px]">
                            <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center sticky top-0 z-20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-600 rounded-lg">
                                        <FileText className="text-white" size={20} />
                                    </div>
                                    <span className="font-bold text-gray-800 dark:text-gray-200">Pratinjau LKPD</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveLKPD}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                        Simpan
                                    </button>
                                    <button
                                        onClick={handleDownloadDocx}
                                        className="px-4 py-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                                    >
                                        <Download size={16} /> Word
                                    </button>
                                </div>
                            </div>
                            <div id="lkpd-preview-content" className="p-8 lg:p-12 overflow-y-auto flex-1 rpp-prose max-w-none custom-scrollbar">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                                >
                                    {lkpdContent}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl">
                            <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-full">
                                <ClipboardList className="text-purple-300 dark:text-purple-700" size={64} />
                            </div>
                            <div className="max-w-md">
                                <h3 className="text-lg font-bold text-gray-400">Belum ada konten</h3>
                                <p className="text-gray-400 text-sm">Pilih RPP dan Kelas di sebelah kiri, lalu klik &quot;Buat LKPD&quot; untuk memulai.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {confirmModal.isOpen && (
                <Modal onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                            <Trash2 className="h-8 w-8 text-red-600" />
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
                                onClick={() => {
                                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                                }}
                                className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition"
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default LkpdGeneratorPage;
