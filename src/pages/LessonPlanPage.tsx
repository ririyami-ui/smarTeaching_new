import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../utils/SettingsContext';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    addDoc,
    serverTimestamp,
    deleteDoc,
    doc
} from 'firebase/firestore';
import { getRegionFromSubject } from '../utils/carakan';
import { formatDate } from '../utils/dateUtils';
import {
    FileText,
    Sparkles,
    Save,
    Trash2,
    Search,
    BookOpen,
    History,
    Loader2,
    Download,
    MapPin,
    ClipboardList,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { asBlob } from 'html-docx-js-typescript';
import { saveAs } from 'file-saver';
import { generateLessonPlan } from '../utils/gemini';
import VisualizationRenderer from '../components/quiz/VisualizationRenderer';
import { findAutoMatchingBook, loadBookContent } from '../utils/bookUtils';
import { useAI } from '../utils/AIContext';
import BSKAP_DATA from '../utils/bskap_2025_intel.json';
import StyledSelect from '../components/StyledSelect';
import StyledButton from '../components/StyledButton';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import DOMPurify from 'dompurify';

interface MaterialItem {
  id?: string | number;
  kd?: string;
  materi: string;
  jp?: string | number;
  distribution?: number[];
  elemen?: string;
  tp?: string;
  profilLulusan?: string;
  subject?: string;
}

interface SavedRPP {
  id: string;
  userId: string;
  subjectId: string;
  subject: string;
  gradeLevel: string;
  topic: string;
  kd?: string;
  studentCharacteristics?: string;
  content: string;
  assessmentModel?: string;
  academicYear: string;
  semester: string;
  createdAt?: { toDate: () => Date };
}

// === Helpers ===

function getDistributions(itemId: string | number | undefined, promes: Record<string, number>): number[] {
    const distributions: number[] = [];
    Object.keys(promes).forEach(key => {
        if (key.startsWith(`${itemId}_`)) {
            const val = Number(promes[key]);
            if (val > 0) distributions.push(val);
        }
    });
    return distributions;
}

interface FetchDeps {
    user: { uid: string };
    selectedGrade: string;
    selectedSubject: string;
    academicYear: string;
    activeSemester: string;
    subjects: { id: string; name: string }[];
}

async function fetchPromesMaterialsData(deps: FetchDeps): Promise<MaterialItem[]> {
    const { user, selectedGrade, selectedSubject, academicYear, activeSemester, subjects } = deps;
    const subjectData = subjects.find(s => s.id === selectedSubject);
    const subjectName = subjectData?.name || selectedSubject;
    const yearId = academicYear.replace('/', '-');
    const programId = `${user.uid}_${subjectName}_${selectedGrade}_${yearId}_${activeSemester}`;
    const programDoc = await getDoc(doc(db, 'teachingPrograms', programId));

    let protaData: MaterialItem[] = [];
    if (programDoc.exists()) {
        const data = programDoc.data();
        const prota = (data.prota || []) as MaterialItem[];
        const promes = data.promes || {};
        protaData = prota.map(item => ({
            ...item,
            distribution: getDistributions(item.id, promes)
        }));
    } else {
        const q = query(
            collection(db, 'teachingPrograms'),
            where('userId', '==', user.uid),
            where('gradeLevel', '==', selectedGrade),
            where('subject', '==', selectedSubject),
            where('academicYear', '==', academicYear),
            where('semester', '==', activeSemester),
            where('type', '!=', 'atp_document')
        );
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
            const data = qSnap.docs[0].data();
            const prota = (data.prota || []) as MaterialItem[];
            const promes = data.promes || {};
            protaData = prota.map(item => ({
                ...item,
                distribution: getDistributions(item.id, promes)
            }));
        }
    }
    return protaData;
}

async function fetchAtpMaterialsData(deps: FetchDeps): Promise<MaterialItem[]> {
    const { user, selectedGrade, selectedSubject, academicYear, activeSemester, subjects } = deps;
    const subjectData = subjects.find(s => s.id === selectedSubject);
    const subjectName = subjectData?.name || selectedSubject;
    const yearId = academicYear.replace('/', '-');

    const atpId = `${user.uid}_${subjectName}_${selectedGrade}_${yearId}_${activeSemester}_ATP`;
    const atpSnap = await getDoc(doc(db, 'teachingPrograms', atpId));

    const mainDocId = `${user.uid}_${subjectName}_${selectedGrade}_${yearId}_${activeSemester}`;
    const mainDocSnap = await getDoc(doc(db, 'teachingPrograms', mainDocId));
    const promes = mainDocSnap.exists() ? mainDocSnap.data().promes || {} : {};

    if (atpSnap.exists() && atpSnap.data().atpItems) {
        const items = atpSnap.data().atpItems as MaterialItem[];
        return items.map((item, index) => {
            const protaId = index + 1;
            return {
                ...item,
                id: protaId,
                distribution: getDistributions(protaId, promes)
            };
        });
    }
    return [];
}

function getBarClass(i: number, step: number): string {
    if (i === step) return 'w-8 bg-blue-600';
    if (i < step) return 'w-3 bg-blue-300';
    return 'w-1.5 bg-gray-200 dark:bg-gray-700';
}

function renderMaterialList(
    sourceType: 'promes' | 'atp',
    atpMaterials: MaterialItem[],
    promesMaterials: MaterialItem[],
    selectedMaterial: MaterialItem | null,
    setSelectedMaterial: (m: MaterialItem) => void,
    setManualKd: (s: string) => void,
    setManualMateri: (s: string) => void,
): React.ReactNode {
    if (sourceType === 'atp') {
        if (atpMaterials.length > 0) {
            return atpMaterials.map((m) => (
                <button key={m.id || m.tp || m.materi} onClick={() => { setSelectedMaterial(m); setManualKd(m.tp || ''); setManualMateri(m.materi || ''); }}
                    className={`w-full text-left p-3 transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/10 ${selectedMaterial === m ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold border-l-4 border-purple-500' : 'text-gray-600 dark:text-gray-400'}`}
                >
                    <div className="text-[10px] uppercase font-bold opacity-60 mb-1">{m.elemen}</div>
                    <div className="text-xs line-clamp-2 leading-relaxed">{m.tp}</div>
                    <div className="mt-1 flex items-center justify-between">
                        <span className="text-[9px] bg-purple-50 dark:bg-purple-900/40 px-1.5 py-0.5 rounded text-purple-600">{m.jp} JP</span>
                        {m.materi && <span className="text-[9px] italic opacity-70">L. Materi: {m.materi}</span>}
                    </div>
                </button>
            ));
        }
        return (
            <div className="p-6 text-center">
                <p className="text-xs text-gray-400">Data ATP tidak ditemukan.</p>
                <p className="text-[10px] text-gray-400 mt-1">Pastikan Anda sudah menyusun ATP di halaman Program Mengajar.</p>
            </div>
        );
    }
    if (promesMaterials.length > 0) {
        return promesMaterials.map((m) => (
            <button key={m.id || m.materi} onClick={() => { setSelectedMaterial(m); setManualKd(m.kd || ''); setManualMateri(m.materi || ''); }}
                className={`w-full text-left p-3 text-sm transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 ${selectedMaterial?.id === m.id ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold' : 'text-gray-600 dark:text-gray-400'}`}
            >{m.materi}</button>
        ));
    }
    return (
        <div className="p-6 text-center">
            <p className="text-xs text-gray-400">Data Promes tidak ditemukan.</p>
        </div>
    );
}

function renderHistoryList(
    filteredRPPs: SavedRPP[],
    generatedRPP: string,
    viewingRPP: SavedRPP | null,
    filterSubject: string,
    setters: {
        setViewingRPP: (r: SavedRPP | null) => void;
        setGeneratedRPP: (s: string) => void;
    },
    handleDelete: (id: string) => void,
    navigate: (path: string) => void,
): React.ReactNode {
    if (filteredRPPs.length === 0) {
        return (
            <p className="text-center text-xs text-gray-400 py-10">
                {filterSubject === 'all' ? 'Belum ada RPP tersimpan.' : 'Tidak ada RPP untuk mapel ini.'}
            </p>
        );
    }
    return filteredRPPs.map((plan) => (
        <div key={plan.id} className="group relative bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-800 transition-all">
            <div className="flex justify-between items-start">
                <button type="button" className="cursor-pointer flex-1 text-left bg-transparent border-none p-0"
                    onClick={() => { setters.setViewingRPP(plan); if (!generatedRPP || viewingRPP?.id !== plan.id) { setters.setGeneratedRPP(''); } }}
                >
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{plan.gradeLevel} - {plan.subject}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">{plan.topic}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{plan.createdAt?.toDate ? formatDate(plan.createdAt.toDate()) : 'N/A'}</p>
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); navigate('/penilaian-kktp'); }}
                        className="text-blue-400 hover:text-blue-600 p-1" title="Lakukan Penilaian Digital"
                    ><ClipboardList size={14} /></button>
                    <button onClick={() => handleDelete(plan.id)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    ));
}

interface DisplayContentState {
    isGenerating: boolean;
    generatedRPP: string;
    viewingRPP: SavedRPP | null;
    isSaving: boolean;
    generationProgress: string;
    progressSteps: string[];
    generationStep: number;
    selectedMaterial: MaterialItem | null;
    userProfile: { name: string; nip: string; principalName: string; principalNip: string };
    signingLocation: string;
}

interface DisplayContentCallbacks {
    handleDownloadDocx: () => void;
    handleSave: () => void;
}

function renderDisplayContent(
    state: DisplayContentState,
    callbacks: DisplayContentCallbacks,
): React.ReactNode {
    const { isGenerating, generatedRPP, viewingRPP, isSaving, generationProgress, progressSteps, generationStep, selectedMaterial, userProfile, signingLocation } = state;
    const { handleDownloadDocx, handleSave } = callbacks;
    if (isGenerating) {
        return (
            <div className="card-glass rounded-3xl p-8 lg:p-12 shadow-xl border-2 border-dashed border-blue-200 dark:border-blue-900 flex flex-col items-center justify-center space-y-6 min-h-[500px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/20 rounded-full -mr-16 -mt-16 blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-50 dark:bg-purple-900/20 rounded-full -ml-16 -mb-16 blur-3xl animate-pulse" />
                <div className="relative z-10">
                    <div className="p-6 bg-blue-50 dark:bg-blue-900/30 rounded-full relative">
                        <Loader2 className="animate-spin text-blue-500" size={80} strokeWidth={1} />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 card-glass p-3 rounded-full shadow-lg">
                            <Sparkles className="text-blue-600 animate-bounce" size={32} />
                        </div>
                    </div>
                </div>
                <div className="text-center space-y-2 z-10 w-full max-w-md">
                    <h2 className="text-xl lg:text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tight">Membangun RPP Masa Depan</h2>
                    <div className="space-y-4">
                        <p className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/40 px-6 py-2.5 rounded-2xl border border-blue-100 dark:border-blue-800 animate-pulse text-sm lg:text-base">
                            {generationProgress}
                        </p>
                        <div className="flex justify-center gap-1.5 pt-2">
                            {progressSteps.map((step, i) => (
                                <div key={step} className={`h-1.5 rounded-full transition-all duration-500 ${getBarClass(i, generationStep)}`} />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm z-10 pt-4">
                    <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-2xl border dark:border-gray-700 flex items-center gap-3">
                        <div className="text-xs font-bold text-gray-400">STATUS</div>
                        <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest animate-pulse">Processing</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-2xl border dark:border-gray-700 flex items-center gap-3">
                        <div className="text-xs font-bold text-gray-400">ALREADY</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{Math.round(((generationStep + 1) / progressSteps.length) * 100)}%</div>
                    </div>
                </div>
                <p className="text-gray-400 text-xs text-center max-w-xs z-10 leading-relaxed italic">
                    &quot;Guru yang baik memberikan sesuatu yang bisa dipikirkan oleh siswa di rumah.&quot; - Smart Teaching AI
                </p>
            </div>
        );
    }
    if (generatedRPP || viewingRPP) {
        return (
            <div id="printable-area" className="card-glass rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col h-full print:m-0 print:p-0 print:block print:h-auto print:shadow-none print:border-none">
                <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center no-print sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg"><FileText className="text-white" size={20} /></div>
                        <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block">Pratinjau RPP</span>
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{viewingRPP ? viewingRPP.topic : selectedMaterial?.materi}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleDownloadDocx} className="p-2.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all text-blue-600 dark:text-blue-400 hover:shadow-md" title="Download Word (.docx)"><Download size={18} /></button>
                        {generatedRPP && (
                            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-bold text-sm transition-all disabled:opacity-50 shadow-md hover:shadow-lg">
                                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Simpan RPP
                            </button>
                        )}
                    </div>
                </div>
                <div className={`p-8 lg:p-12 overflow-y-auto flex-1 rpp-prose max-w-none print:p-0 print:overflow-visible custom-scrollbar ${getRegionFromSubject(viewingRPP?.subject || selectedMaterial?.subject || '') === 'Jawa' ? 'font-carakan' : ''}`}>
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]} 
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            p: ({ children, ...rest }) => {
                                const content = String(children).trim();
                                // Deteksi pola JSON visualisasi
                                if (content.startsWith('{"type":') && content.endsWith('}')) {
                                    try {
                                        // Robust Repair: Ganti newline asli dengan \n agar JSON.parse tidak error
                                        const repaired = content.replace(/\n/g, '\\n');
                                        const parsed = JSON.parse(repaired);
                                        
                                        if (parsed.type && parsed.config) {
                                            return (
                                                <div className="my-6 visualization-container">
                                                    <VisualizationRenderer 
                                                        visualization={{
                                                            type: parsed.type as any,
                                                            config: parsed.config
                                                        }}
                                                    />
                                                </div>
                                            );
                                        }
                                    } catch (e) {
                                        // Gagal parse, biarkan sebagai teks
                                    }
                                }
                                return <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed text-justify" {...rest}>{children}</p>;
                            },
                            code(props) {
                                const { inline, className, children, ...rest } = props as any;
                                const match = /language-(\w+)/.exec(className || '');
                                const language = match ? match[1] : '';
                                const content = String(children).replace(/\n$/, '');

                                if (!inline && (language === 'mermaid' || language === 'chart' || language === 'json')) {
                                    try {
                                        let config = {};
                                        let finalType = language;
                                        
                                        if (language === 'mermaid') {
                                            config = { diagram: content };
                                        } else if (language === 'chart' || language === 'json') {
                                            // Robust Repair untuk blok kode juga
                                            const repaired = content.replace(/\n/g, '\\n');
                                            const parsed = JSON.parse(repaired);
                                            if (language === 'json') {
                                                if (parsed.type && parsed.config) {
                                                    finalType = parsed.type;
                                                    config = parsed.config;
                                                } else {
                                                    return <code className={className} {...rest}>{children}</code>;
                                                }
                                            } else {
                                                config = parsed;
                                            }
                                        }
                                        
                                        return (
                                            <div className="my-6 visualization-container">
                                                <VisualizationRenderer 
                                                    visualization={{
                                                        type: finalType as any,
                                                        config: config
                                                    }}
                                                />
                                            </div>
                                        );
                                    } catch (e) {
                                        return <code className={className} {...rest}>{children}</code>;
                                    }
                                }
                                return <code className={className} {...rest}>{children}</code>;
                            }
                        }}
                    >
                        {generatedRPP || (viewingRPP ? viewingRPP.content : '')}
                    </ReactMarkdown>
                    <div id="signature-section" className="mt-12 pt-8 border-t border-transparent no-break-inside avoid-page-break">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p>Mengetahui,</p>
                                <p className="font-bold mb-16">Kepala Sekolah</p>
                                <p className="font-bold underline">{userProfile.principalName || '.....................................'}</p>
                                <p>NIP. {userProfile.principalNip || '...................'}</p>
                            </div>
                            <div></div>
                            <div>
                                <p>{signingLocation || 'Jakarta'}, {formatDate(new Date())}</p>
                                <p className="font-bold mb-16">Guru Mata Pelajaran</p>
                                <p className="font-bold underline">{userProfile.name || '.....................................'}</p>
                                <p>NIP. {userProfile.name ? userProfile.nip : '...................'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="card-glass rounded-3xl p-12 shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-full"><BookOpen className="text-blue-600" size={64} /></div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Mulai Susun RPP Deep Learning</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    Pilih materi pokok dari data Program Semester di sebelah kiri, lalu klik tombol **Generate** untuk menyusun RPP berbasis prinsip **Mindful, Meaningful, & Joyful**.
                </p>
            </div>
            <div className="flex gap-4">
                <div className="flex items-center gap-2 text-xs text-gray-400 italic"><Sparkles size={14} /> Berbasis Kurikulum Deep Learning</div>
                <div className="flex items-center gap-2 text-xs text-gray-400 italic"><History size={14} /> Tersimpan Otomatis</div>
            </div>
        </div>
    );
}

const LessonPlanPage: React.FC = () => {
    const { user } = useAuth();
    const { activeSemester, academicYear, geminiModel } = useSettings();
    const { tasks, startGeneration } = useAI();
    const navigate = useNavigate();
    const [levels, setLevels] = useState<string[]>([]);
    const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [promesMaterials, setPromesMaterials] = useState<MaterialItem[]>([]);
    const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
    const [sourceType, setSourceType] = useState<'promes' | 'atp'>('promes');
    const [atpMaterials, setAtpMaterials] = useState<MaterialItem[]>([]);
    const [teachingModel, setTeachingModel] = useState('Otomatis');
    const [assessmentModel, setAssessmentModel] = useState('Otomatis');

    const aiTask = tasks.lessonPlan;
    const isGenerating = aiTask.status === 'loading';

    const [generatedRPP, setGeneratedRPP] = useState<string>(typeof aiTask.result === 'string' ? aiTask.result : '');
    const [savedRPPs, setSavedRPPs] = useState<SavedRPP[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [viewingRPP, setViewingRPP] = useState<SavedRPP | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: (() => void) | null;
    }>({ isOpen: false, title: '', message: '', onConfirm: null });

    const [generationProgress, setGenerationProgress] = useState(aiTask.progress || '');
    const [generationStep, setGenerationStep] = useState(0);
    const progressSteps = React.useMemo(() => [
        "Menganalisis Kurikulum BSKP 046/2025...",
        "Menyinkronkan Materi dengan CP & TP...",
        "Menyusun Identitas Modul & Sarana Prasarana...",
        "Merancang Langkah Pembelajaran (Mindful, Meaningful, Joyful)...",
        "Menyusun Instrumen Asesmen (Diagnostik, Formatif, Sumatif)...",
        "Finalisasi LKPD & Materi Ajar Mendetail...",
        "Melakukan Kontrol Kualitas & Standarisasi..."
    ], []);

    const [manualKd, setManualKd] = useState('');
    const [manualMateri, setManualMateri] = useState('');

    const [userProfile, setUserProfile] = useState({ name: '', school: '', nip: '', principalName: '', principalNip: '', schoolLevel: '' });
    const [signingLocation, setSigningLocation] = useState('Jakarta');
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [studentCharacteristics, setStudentCharacteristics] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('SIGNING_LOCATION');
        if (saved) setSigningLocation(saved);
    }, []);

    const [filterSubject, setFilterSubject] = useState('all');

    const filteredRPPs = savedRPPs.filter(plan => {
        if (filterSubject === 'all') return true;

        const selectedSubjectDat = subjects.find(s => s.id === filterSubject);
        const selectedSubjectName = selectedSubjectDat ? selectedSubjectDat.name : '';

        return plan.subjectId === filterSubject ||
            plan.subject === filterSubject ||
            (selectedSubjectName && plan.subject === selectedSubjectName);
    });

    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Browser tidak mendukung geolokasi.");
            return;
        }

        setDetectingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await response.json();

                    const city = data.address.city || data.address.town || data.address.regency || data.address.county || 'Lokasi Terdeteksi';
                    setSigningLocation(city);
                    localStorage.setItem('SIGNING_LOCATION', city);
                    toast.success(`Lokasi terdeteksi: ${city}`);
                } catch (error) {
                    console.error("Error detecting location:", error);
                    toast.error("Gagal mendeteksi nama kota.");
                } finally {
                    setDetectingLocation(false);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                if (error.code === 1) toast.error("Izin lokasi ditolak. Mohon izinkan browser.");
                else toast.error("Gagal mendapatkan lokasi. Pastikan GPS aktif.");
                setDetectingLocation(false);
            }
        );
    };

    useEffect(() => {
        const fetchMasters = async () => {
            if (!user) return;
            try {
                const classesQuery = query(collection(db, 'classes'), where('userId', '==', user.uid));
                const subjectsQuery = query(collection(db, 'subjects'), where('userId', '==', user.uid));

                const [classesSnap, subjectsSnap] = await Promise.all([
                    getDocs(classesQuery),
                    getDocs(subjectsQuery)
                ]);

                const uniqueLevels = [...new Set(classesSnap.docs.map(doc => String(doc.data().level)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                const fetchedSubjects = subjectsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name as string })).sort((a, b) => a.name.localeCompare(b.name));

                setLevels(uniqueLevels);
                setSubjects(fetchedSubjects);

                if (uniqueLevels.length > 0) setSelectedGrade(uniqueLevels[0]);
                if (fetchedSubjects.length > 0) setSelectedSubject(fetchedSubjects[0].id);

                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setUserProfile({
                        name: userDoc.data().name || '',
                        school: userDoc.data().school || '',
                        nip: userDoc.data().nip || '',
                        principalName: userDoc.data().principalName || '',
                        principalNip: userDoc.data().principalNip || '',
                        schoolLevel: userDoc.data().schoolLevel || ''
                    });
                }
            } catch (error) {
                console.error("Error fetching masters:", error);
                toast.error("Gagal memuat data master");
            }
        };
        fetchMasters();
    }, [user]);

    useEffect(() => {
        const params = new URLSearchParams(globalThis.location.search);
        const qGrade = params.get('grade');
        const qSubject = params.get('subject');
        const qTopic = params.get('topic');

        if (qGrade) setSelectedGrade(qGrade);
        if (qSubject) setSelectedSubject(qSubject);
        if (qTopic) {
            setManualMateri(qTopic);
            setManualKd(qTopic);
        }
    }, [levels, subjects]);

    useEffect(() => {
        if (selectedMaterial) {
            setManualKd(selectedMaterial.kd || selectedMaterial.tp || '');
            setManualMateri(selectedMaterial.materi || '');
        } else {
            setManualKd('');
            setManualMateri('');
        }
    }, [selectedMaterial]);

    useEffect(() => {
        if (!user) return;
        if (!selectedGrade) return;
        if (!selectedSubject) return;

        if (aiTask.status === 'idle') {
            setSelectedMaterial(null);
            setGeneratedRPP('');
        }

        const deps: FetchDeps = { user, selectedGrade, selectedSubject, academicYear, activeSemester, subjects };
        const isPromes = sourceType === 'promes';
        const fetchFn = isPromes ? fetchPromesMaterialsData : fetchAtpMaterialsData;
        const setter = isPromes ? setPromesMaterials : setAtpMaterials;

        fetchFn(deps).then(data => {
            setter(data);
            const topic = aiTask.params?.topic;
            if (typeof topic === 'string' && data.length > 0) {
                const match = data.find(m => m.materi === topic);
                if (match) setSelectedMaterial(match);
            }
        }).catch(error => {
            console.error("Error fetching materials:", error);
        });
    }, [selectedGrade, selectedSubject, activeSemester, academicYear, sourceType, subjects, aiTask.status, aiTask.params, user]);

    const fetchRPPHistory = useCallback(async () => {
        if (!user) return;
        setLoadingHistory(true);
        try {
            const q = query(
                collection(db, 'lessonPlans'),
                where('userId', '==', user.uid)
            );
            const querySnapshot = await getDocs(q);
            const plans = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedRPP));

            const sortedPlans = plans.toSorted((a, b) => {
                const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return bTime - aTime;
            });

            setSavedRPPs(sortedPlans);
        } catch (error) {
            console.error("Error fetching RPP history:", error);
        } finally {
            setLoadingHistory(false);
        }
    }, [user]);

    useEffect(() => {
        fetchRPPHistory();
    }, [fetchRPPHistory]);

    const handleGenerate = async () => {
        if (!selectedMaterial) {
            toast.error("Pilih materi atau butir ATP terlebih dahulu");
            return;
        }

        const subjectData = subjects.find(s => s.id === selectedSubject);
        const subjectName = subjectData?.name || selectedSubject;

        setGenerationStep(0);
        setGenerationProgress(progressSteps[0]);
        setViewingRPP(null);

        try {
            let bookContext = null;
            const matchedBook = findAutoMatchingBook(userProfile?.schoolLevel || 'SMP', subjectName, selectedGrade);
            if (matchedBook) {
                bookContext = await loadBookContent(matchedBook.path);
            }

            await startGeneration('lessonPlan', async (context) => {
                return await generateLessonPlan({
                    kd: manualKd || selectedMaterial.kd || selectedMaterial.tp || '',
                    materi: manualMateri || selectedMaterial.materi,
                    gradeLevel: selectedGrade,
                    subject: subjectName,
                    academicYear,
                    semester: activeSemester,
                    teacherName: userProfile.name,
                    teacherNip: userProfile.nip,
                    schoolName: userProfile.school,
                    principalName: userProfile.principalName,
                    principalNip: userProfile.principalNip,
                    jp: selectedMaterial.jp,
                    distribution: selectedMaterial.distribution,
                    teachingModel: teachingModel,
                    assessmentModel: assessmentModel,
                    modelName: geminiModel,
                    sourceType: sourceType,
                    elemen: selectedMaterial.elemen || '',
                    profilLulusan: selectedMaterial.profilLulusan || '',
                    studentCharacteristics: studentCharacteristics,
                    bookContext: bookContext,
                    onProgress: context.onProgress
                });
            }, {
                grade: selectedGrade,
                subject: subjectName,
                topic: manualMateri || selectedMaterial.materi
            });
        } catch {
            // Handled by context
        }
    };

    useEffect(() => {
        if (aiTask.status === 'success' && aiTask.result) {
            setGeneratedRPP(typeof aiTask.result === 'string' ? aiTask.result : '');
        }
    }, [aiTask.status, aiTask.result]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (isGenerating) {
            interval = setInterval(() => {
                setGenerationStep(prev => {
                    if (prev < progressSteps.length - 1) return prev + 1;
                    return prev;
                });
            }, 3500);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isGenerating, progressSteps.length]);

    useEffect(() => {
        if (isGenerating) {
            setGenerationProgress(progressSteps[generationStep]);
        }
    }, [generationStep, isGenerating, progressSteps]);

    const handleSave = async () => {
        if (!generatedRPP || !selectedMaterial || !user) return;
        setIsSaving(true);
        try {
            const subjectData = subjects.find(s => s.id === selectedSubject);
            const subjectName = subjectData?.name || selectedSubject;

            await addDoc(collection(db, 'lessonPlans'), {
                userId: user.uid,
                subjectId: selectedSubject,
                subject: subjectName,
                gradeLevel: selectedGrade,
                topic: manualMateri || selectedMaterial.materi,
                kd: manualKd || selectedMaterial.kd || selectedMaterial.tp || '',
                studentCharacteristics: studentCharacteristics,
                content: generatedRPP,
                assessmentModel,
                academicYear,
                semester: activeSemester,
                createdAt: serverTimestamp()
            });
            toast.success("RPP berhasil disimpan ke riwayat!");
            fetchRPPHistory();
        } catch {
            toast.error("Gagal menyimpan RPP");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Hapus RPP',
            message: 'HAPUS RIWAYAT: Apakah Anda yakin ingin menghapus RPP ini dari riwayat?',
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'lessonPlans', id));
                    toast.success("RPP dihapus");
                    fetchRPPHistory();
                    if (viewingRPP?.id === id) setViewingRPP(null);
                } catch {
                    toast.error("Gagal menghapus");
                } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false, onConfirm: null }));
                }
            }
        });
    };

    const handleDownloadDocx = async () => {
        const content = document.getElementById('printable-area');
        if (!content) return;

        const clone = content.cloneNode(true) as HTMLElement;

        // Tangkap semua visualisasi yang aktif di layar
        const visualContainers = content.querySelectorAll('.visualization-container');
        const visualImages: string[] = [];
        
        for (const container of Array.from(visualContainers)) {
            try {
                const canvas = await html2canvas(container as HTMLElement, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff'
                });
                visualImages.push(canvas.toDataURL('image/png'));
            } catch (e) {
                console.error("Failed to capture visualization:", e);
                visualImages.push('');
            }
        }

        // Ganti elemen visual di clone dengan gambar yang sudah ditangkap
        const cloneVisuals = clone.querySelectorAll('.visualization-container');
        cloneVisuals.forEach((el, index) => {
            if (visualImages[index]) {
                const img = document.createElement('img');
                img.src = visualImages[index];
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.margin = '10px 0';
                img.style.display = 'block';
                el.parentNode?.replaceChild(img, el);
            } else {
                el.remove();
            }
        });

        // Hapus elemen UI lainnya dan tanda tangan layar (agar tidak double)
        const uiElements = clone.querySelectorAll('button, .no-print, #signature-section');
        uiElements.forEach(el => el.remove());

        const htmlString = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { 
                        font-family: Arial, Helvetica, sans-serif; 
                        font-size: 11pt; 
                        line-height: 1.5;
                        color: #000;
                    }
                    h1 { text-align: center; text-transform: uppercase; font-size: 14pt; border-bottom: 3px double #000; padding-bottom: 5px; }
                    h2 { text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 3px; font-size: 12pt; margin-top: 20px; }
                    h3 { border-bottom: 1px solid #ccc; padding-bottom: 2px; font-size: 11pt; margin-top: 15px; }
                    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
                    th, td { border: 1px solid black; padding: 8px; font-size: 11pt; color: #000; }
                    th { background-color: #f0f0f0; font-weight: bold; }
                    p { margin-bottom: 10px; text-align: justify; }
                    ol, ul { padding-left: 30px; }
                    li { margin-bottom: 5px; }
                    table:last-of-type, table:last-of-type td, table:last-of-type th { border: none !important; }
                </style>
            </head>
            <body>
                <div class="rpp-prose">
                    ${DOMPurify.sanitize(clone.innerHTML)}
                </div>
                
                <table style="border: none; margin-top: 50px; width: 100%;">
                    <tr style="border: none;">
                        <td align="center" style="border: none; width: 50%;">
                            Mengetahui,<br/>
                            Kepala Sekolah
                            <br/><br/><br/><br/>
                            <strong>${userProfile.principalName || '.....................................'}</strong><br/>
                            NIP. ${userProfile.principalNip || '...................'}
                        </td>
                        <td align="center" style="border: none; width: 50%;">
                            ${signingLocation || 'Jakarta'}, ${formatDate(new Date())}<br/>
                            Guru Mata Pelajaran
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
            const subjectData = subjects.find(s => s.id === selectedSubject);
            const subjectName = subjectData?.name || selectedSubject || 'Mapel';
            const topicName = (viewingRPP ? viewingRPP.topic : manualMateri || selectedMaterial?.materi || 'Materi').substring(0, 30);

            // Sanitasi nama file
            const safeSubject = subjectName.replace(/[^a-z0-9]/gi, '_');
            const safeTopic = topicName.replace(/[^a-z0-9]/gi, '_');
            const safeGrade = String(selectedGrade).replace(/[^a-z0-9]/gi, '_');
            const fileName = `RPP_${safeSubject}_G${safeGrade}_${safeTopic}.docx`;

            const result = await asBlob(htmlString);
            const blob = result instanceof Blob ? result : new Blob([result as any], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

            // Gunakan FileReader untuk membuat Data URI (Lebih ampuh memaksa nama file di localhost)
            const reader = new FileReader();
            reader.onload = function(e) {
                const dataUrl = e.target?.result as string;
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };
            reader.readAsDataURL(blob);
            
            toast.success("RPP sedang didownload (.docx)");
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Gagal membuat file Word");
        }
    };

    const materialListContent = renderMaterialList(
        sourceType, atpMaterials, promesMaterials, selectedMaterial,
        setSelectedMaterial, setManualKd, setManualMateri,
    );

    const historyListContent = renderHistoryList(
        filteredRPPs, generatedRPP, viewingRPP, filterSubject,
        { setViewingRPP, setGeneratedRPP }, handleDelete, navigate,
    );

    const displayContent = renderDisplayContent(
        { isGenerating, generatedRPP, viewingRPP, isSaving, generationProgress, progressSteps, generationStep, selectedMaterial, userProfile, signingLocation },
        { handleDownloadDocx, handleSave },
    );

    return (
        <div className="max-w-[1500px] mx-auto px-4 py-4 lg:py-8 min-h-screen print:m-0 print:p-0 print:max-w-none">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 lg:mb-8 no-print">
                <div>
                    <h1 className="text-3xl font-extrabold text-blue-800 dark:text-blue-100 flex items-center gap-3">
                        <Sparkles className="text-blue-600 animate-pulse" />
                        Penyusunan RPP AI
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Susun rencana pembelajaran otomatis berdasarkan data Promes Anda.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 print:block">
                {/* Input Control */}
                <div className="lg:col-span-1 space-y-6 no-print lg:sticky lg:top-8">
                    <div className="card-glass p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <Search size={20} className="text-blue-500" />
                            Pilih Sumber Materi
                        </h3>

                        <StyledSelect
                            label="Kelas"
                            value={selectedGrade}
                            onChange={(e) => setSelectedGrade(e.target.value)}
                        >
                            {levels.map(l => <option key={l} value={l}>{l}</option>)}
                        </StyledSelect>

                        <StyledSelect
                            label="Mata Pelajaran"
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                        >
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </StyledSelect>

                        <div className="space-y-1.5">
                            <div className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 flex justify-between items-center">
                                <span>Materi Pokok / ATP</span>
                                <div className="flex bg-gray-100 dark:bg-gray-700 p-0.5 rounded-lg border dark:border-gray-600 scale-90 origin-right">
                                    <button
                                        onClick={() => setSourceType('promes')}
                                        className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold transition-all ${sourceType === 'promes' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500'}`}
                                    >Promes</button>
                                    <button
                                        onClick={() => setSourceType('atp')}
                                        className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold transition-all ${sourceType === 'atp' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500'}`}
                                    >ATP</button>
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto border dark:border-gray-600 rounded-xl divide-y dark:divide-gray-700">
                                {materialListContent}
                            </div>
                        </div>

                        {selectedMaterial && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="space-y-1.5">
                                    <label htmlFor="kd-textarea" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Kompetensi Dasar / CP (Dapat Diedit)</label>
                                    <textarea
                                        id="kd-textarea"
                                        value={manualKd}
                                        onChange={(e) => setManualKd(e.target.value)}
                                        rows={3}
                                        className="w-full p-3 text-sm border dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Masukkan KD/CP..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="materi-textarea" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Materi Pokok (Dapat Diedit)</label>
                                    <textarea
                                        id="materi-textarea"
                                        value={manualMateri}
                                        onChange={(e) => setManualMateri(e.target.value)}
                                        rows={2}
                                        className="w-full p-3 text-sm border dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Masukkan Materi Pokok..."
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label htmlFor="student-char-textarea" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Karakteristik Peserta Didik (Opsional)</label>
                            <textarea
                                id="student-char-textarea"
                                value={studentCharacteristics}
                                onChange={(e) => setStudentCharacteristics(e.target.value)}
                                rows={3}
                                className="w-full p-3 text-sm border dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Contoh: Sebagian peserta didik sudah memahami tentang perhitungan aritmatika dasar..."
                            />
                            <p className="text-[10px] text-gray-400 ml-1 italic">* Kosongkan untuk generate otomatis oleh AI</p>
                        </div>

                        <StyledSelect
                            label="Model Pembelajaran"
                            value={teachingModel}
                            onChange={(e) => setTeachingModel(e.target.value)}
                        >
                            <option value="Otomatis">Otomatis (Pilihan Terbaik AI)</option>
                            {BSKAP_DATA.pedagogis.preferred_models.map(m => (
                                <option key={m.name} value={m.name}>{m.name}</option>
                            ))}
                            <option value="Cooperative Learning">Cooperative Learning</option>
                            <option value="Ceramah Plus">Ceramah Plus / Ekspositori</option>
                        </StyledSelect>

                        <StyledSelect
                            label="Pendekatan Asesmen (KKTP)"
                            value={assessmentModel}
                            onChange={(e) => setAssessmentModel(e.target.value)}
                        >
                            <option value="Otomatis">Otomatis (Pilihan Terbaik AI)</option>
                            {BSKAP_DATA.kktp_standards.methods.map(m => (
                                <option key={m.type} value={m.type}>{m.type}</option>
                            ))}
                        </StyledSelect>

                        <div>
                            <label htmlFor="signing-location" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 ml-1">Kota (Tanda Tangan)</label>
                            <div className="flex gap-2">
                                <input
                                    id="signing-location"
                                    type="text"
                                    className="w-full p-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 text-sm"
                                    value={signingLocation}
                                    onChange={(e) => {
                                        setSigningLocation(e.target.value);
                                        localStorage.setItem('SIGNING_LOCATION', e.target.value);
                                    }}
                                    placeholder="Contoh: Jakarta"
                                />
                                <button
                                    onClick={handleDetectLocation}
                                    disabled={detectingLocation}
                                    className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors"
                                    title="Deteksi Lokasi Otomatis"
                                >
                                    {detectingLocation ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
                                </button>
                            </div>
                        </div>

                        <StyledButton
                            onClick={handleGenerate}
                            disabled={isGenerating || !selectedMaterial}
                            variant="ai"
                            className="w-full flex items-center justify-center gap-2 py-3"
                        >
                            {isGenerating ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <Sparkles size={18} />
                            )}
                            {isGenerating ? 'Menyusun RPP...' : 'Generate RPP AI'}
                        </StyledButton>
                    </div>

                    <div className="card-glass p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 space-y-4 no-print">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <History size={20} className="text-purple-500" />
                            Riwayat RPP
                        </h3>

                        <div className="mb-2">
                            <select
                                value={filterSubject}
                                onChange={(e) => setFilterSubject(e.target.value)}
                                className="w-full p-2 text-xs border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-1 focus:ring-purple-500"
                            >
                                <option value="all">Semua Mata Pelajaran</option>
                                {subjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                            {loadingHistory ? (
                                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-300" /></div>
                            ) : (
                                historyListContent
                            )}
                        </div>
                    </div>
                </div>

                {/* Display Area */}
                <div className="lg:col-span-3 flex flex-col h-[600px] lg:h-auto print:h-auto print:block print:w-full">
                    {displayContent}
                </div>
            </div>

            {/* Confirmation Modal */}
            {
                confirmModal.isOpen && (
                    <Modal onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false, onConfirm: null }))}>
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                                <Trash2 className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{confirmModal.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">{confirmModal.message}</p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false, onConfirm: null }))}
                                    className="px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmModal.onConfirm || undefined}
                                    className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition"
                                >
                                    Hapus
                                </button>
                            </div>
                        </div>
                    </Modal>
                )
            }
        </div >
    );
};

export default LessonPlanPage;





