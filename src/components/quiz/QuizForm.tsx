import React from 'react';
import {
    FileText, MapPin, Loader2, Upload, BrainCircuit, Sliders, RefreshCw
} from 'lucide-react';
import StyledSelect from '../StyledSelect';
import ProgressBar from '../ProgressBar';

interface QuestionType {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface SourceDataItem {
  id: string;
  subject?: string;
  gradeLevel?: string;
  materi?: string;
  topic?: string;
  academicYear?: string;
  semester?: string;
  grade?: string;
  name?: string;
}

interface SubjectItem {
  id: string;
  name: string;
}

interface ClassItem {
  level?: string;
}

interface QuizFormProps {
  sourceType: string;
  setSourceType: (type: string) => void;
  sourceData: SourceDataItem[];
  loading: boolean;
  selectedContextId: string;
  handleSourceChange: (id: string) => void;
  subject: string;
  setSubject: (subject: string) => void;
  subjects: SubjectItem[];
  gradeLevel: string;
  setGradeLevel: (level: string) => void;
  classes: ClassItem[];
  topic: string;
  setTopic: (topic: string) => void;
  signingLocation: string;
  setSigningLocation: (loc: string) => void;
  handleDetectLocation: () => void;
  detectingLocation: boolean;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
  setImageFile: (file: File | null) => void;
  contextContent: string;
  setContextContent: (content: string) => void;
  difficulty: number;
  setDifficulty: (diff: number) => void;
  stimulusMode: string;
  setStimulusMode: (mode: string) => void;
  typeCounts: Record<string, string | number>;
  updateTypeCount: (id: string, count: string) => void;
  handleGenerate: () => void;
  generating: boolean;
  generationProgress: { stage: string; message: string; percentage: number };
  QUESTION_TYPES: QuestionType[];
}

const QuizForm: React.FC<QuizFormProps> = ({
    sourceType, setSourceType,
    sourceData, loading,
    selectedContextId, handleSourceChange,
    subject, setSubject, subjects,
    gradeLevel, setGradeLevel, classes,
    topic, setTopic,
    signingLocation, setSigningLocation,
    handleDetectLocation, detectingLocation,
    previewUrl, setPreviewUrl, setImageFile,
    contextContent, setContextContent,
    difficulty, setDifficulty,
    stimulusMode,
    setStimulusMode,
    typeCounts, updateTypeCount,
    handleGenerate, generating,
    generationProgress,
    QUESTION_TYPES
}) => {
    const totalQuestions = Object.values(typeCounts).reduce<number>((sum, c) => sum + (parseInt(c as string) || 0), 0);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* LEFT: Context & Basics */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><FileText size={18} /> Konteks & Materi</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Sumber Data</label>
                            <StyledSelect value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                                <option value="rpp">Modul Ajar / RPP</option>
                                <option value="promes">Program Semester</option>
                                <option value="manual">Input Manual</option>
                                <option value="image">Upload Gambar (Vision)</option>
                            </StyledSelect>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Pilih Dokumen</label>
                            <StyledSelect
                                value={selectedContextId}
                                onChange={(e) => handleSourceChange(e.target.value)}
                                disabled={sourceType === 'manual' || sourceType === 'image'}
                            >
                                <option value="">{loading ? 'Memuat...' : '-- Pilih --'}</option>
                                {sourceData
                                    .filter(d => !subject || (d.subject && d.subject.toLowerCase() === subject.toLowerCase()))
                                    .map(d => (
                                        <option key={d.id} value={d.id}>
                                            {sourceType === 'rpp'
                                                ? `${d.gradeLevel || 'Kelas'} - ${d.materi || d.topic} (${d.academicYear || ''})`
                                                : `${d.subject} - ${d.gradeLevel || d.grade} (${d.semester})`
                                            }
                                        </option>
                                    ))}
                            </StyledSelect>
                            {subject && sourceData.filter(d => d.subject && d.subject.toLowerCase() === subject.toLowerCase()).length === 0 && (
                                <p className="text-[10px] text-amber-600 mt-1">Tidak ada {sourceType.toUpperCase()} untuk mapel ini.</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Mata Pelajaran</label>
                            <StyledSelect
                                value={subjects.find(s => s.name === subject)?.id || ''}
                                onChange={(e) => {
                                    const s = subjects.find(sub => sub.id === e.target.value);
                                    setSubject(s ? s.name : e.target.value);
                                }}
                            >
                                <option value="">Pilih Mapel</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </StyledSelect>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Kelas (Level)</label>
                            <StyledSelect
                                value={gradeLevel}
                                onChange={(e) => setGradeLevel(e.target.value)}
                            >
                                <option value="">Pilih Kelas</option>
                                {[...new Set(classes.map(c => c.level).filter(Boolean))].sort((a, b) => {
                                    const numA = parseInt(String(a).replace(/\D/g, '')) || 0;
                                    const numB = parseInt(String(b).replace(/\D/g, '')) || 0;
                                    return numA - numB;
                                }).map(level => <option key={level} value={level}>{level}</option>)}
                            </StyledSelect>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Topik Spesifik / KD</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Contoh: Ekosistem, Hukum Newton..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Kota / Tempat (Untuk Tanda Tangan)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={signingLocation}
                                onChange={(e) => {
                                    setSigningLocation(e.target.value);
                                    localStorage.setItem('SIGNING_LOCATION', e.target.value);
                                }}
                                placeholder="Contoh: Jakarta, Bondowoso..."
                            />
                            <button
                                onClick={handleDetectLocation}
                                disabled={detectingLocation}
                                title="Deteksi Lokasi Otomatis"
                                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                            >
                                {detectingLocation ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
                            </button>
                        </div>
                    </div>

                    {sourceType === 'image' ? (
                        <div>
                            <label className="block text-sm font-medium mb-1">Upload Gambar Referensi</label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    id="image-upload"
                                    className="hidden"
                                    onChange={(e) => {
                                        const files = e.target.files;
                                        if (files && files[0]) {
                                            const file = files[0];
                                            setImageFile(file);
                                            const reader = new FileReader();
                                            reader.onloadend = () => setPreviewUrl(reader.result as string | null);
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                                <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-2 w-full h-full">
                                    {previewUrl ? (
                                        <div className="relative">
                                            <img src={previewUrl} alt="Preview" className="h-32 object-contain rounded-md shadow-sm" />
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setImageFile(null);
                                                    setPreviewUrl(null);
                                                }}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                                            >
                                                <RefreshCw size={12} className="rotate-45" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="text-gray-400" size={32} />
                                            <span className="text-sm text-gray-500">Klik untuk upload gambar (Diagram, Teks, dll)</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium mb-1">Konteks Tambahan (AI Reading)</label>
                            <textarea
                                className="w-full p-2 border rounded-lg h-24 text-sm dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={contextContent}
                                onChange={(e) => setContextContent(e.target.value)}
                                placeholder="Isi materi atau kopikan teks RPP di sini untuk referensi AI..."
                            />
                        </div>
                    )}
                </div>

                {/* RIGHT: Advanced Settings */}
                <div className="space-y-4 border-t md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-8 dark:border-gray-700">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sliders size={18} /> Konfigurasi Soal</h3>

                    <div className="flex justify-between items-center">
                        <label className="font-medium">Total Soal</label>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {totalQuestions}
                            </span>
                            <span className="text-xs text-gray-500">butir</span>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between mb-1">
                            <label className="font-medium text-sm">Tingkat Kesulitan (HOTS Meter)</label>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${difficulty > 70 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {difficulty}% - {difficulty > 70 ? 'HOTS' : difficulty > 30 ? 'MOTS' : 'LOTS'}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0" max="100"
                            value={difficulty}
                            onChange={(e) => setDifficulty(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>Mudah</span>
                            <span>Menalar</span>
                            <span>Kritis</span>
                        </div>
                    </div>

                    {/* Stimulus Mode Selector */}
                    <div>
                        <label className="block text-sm font-medium mb-3">Mode Stimulus Soal</label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'with_stimulus', label: 'Ada Stimulus', emoji: '📄', color: 'bg-blue-600', lightColor: 'bg-blue-50', textColor: 'text-blue-600', ring: 'ring-blue-200' },
                                { id: 'auto', label: 'Campuran', emoji: '🔀', color: 'bg-indigo-600', lightColor: 'bg-indigo-50', textColor: 'text-indigo-600', ring: 'ring-indigo-200' },
                                { id: 'no_stimulus', label: 'Tanpa Stimulus', emoji: '✏️', color: 'bg-emerald-600', lightColor: 'bg-emerald-50', textColor: 'text-emerald-600', ring: 'ring-emerald-200' },
                            ].map(mode => {
                                const isActive = stimulusMode === mode.id;
                                return (
                                    <button
                                        key={mode.id}
                                        type="button"
                                        onClick={() => setStimulusMode(mode.id)}
                                        className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300 border-2 ${
                                            isActive 
                                                ? `${mode.color} text-white border-transparent shadow-lg scale-[1.02] z-10` 
                                                : `bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500 hover:border-gray-200 dark:hover:border-gray-600`
                                        }`}
                                    >
                                        {isActive && (
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-300">
                                                <div className={`w-4 h-4 rounded-full ${mode.color} flex items-center justify-center text-[10px] text-white`}>✓</div>
                                            </div>
                                        )}
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner ${isActive ? 'bg-white/20' : 'bg-gray-50 dark:bg-gray-900'}`}>
                                            {mode.emoji}
                                        </div>
                                        <span className="text-[11px] font-bold tracking-tight text-center leading-tight">
                                            {mode.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 transition-all">
                            <p className="text-[10px] leading-relaxed text-gray-500 dark:text-gray-400">
                                {stimulusMode === 'with_stimulus' && '📄 Mode Literasi: Setiap soal akan diawali dengan stimulus (teks/data/narasi).'}
                                {stimulusMode === 'no_stimulus' && '✏️ Mode Direct: Soal dibuat langsung tanpa narasi pendahulu (lebih ringkas).'}
                                {stimulusMode === 'auto' && '🔀 Mode Campuran: AI akan mengatur distribusi ganjil/genap (50% kognitif stimulus).'}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-3">Jumlah Soal per Tipe</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {QUESTION_TYPES.map(type => (
                                <div
                                    key={type.id}
                                    title={type.description}
                                    className="flex items-center justify-between p-4 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 shadow-sm hover:shadow-md transition-shadow cursor-help"
                                >
                                    <div className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 min-w-0 mr-3">
                                        <div className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm text-blue-500 shrink-0">
                                            {type.icon}
                                        </div>
                                        <span className="leading-tight truncate">{type.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={typeCounts[type.id] || ''}
                                            onChange={(e) => updateTypeCount(type.id, e.target.value)}
                                            placeholder="0"
                                            className="w-20 px-3 py-2 text-center font-bold border rounded-lg dark:bg-gray-800 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="group relative w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition transform active:scale-95 flex justify-center items-center gap-2 mt-4"
                    >
                        {generating ? <RefreshCw className="animate-spin" /> : <BrainCircuit />}
                        {generating ? 'Sedang Meracik Soal...' : 'GENERATE SOAL SEKARANG'}
                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-900 text-[10px] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-white/10">
                            ⚡ Menggunakan Quota AI
                        </span>
                    </button>

                    {/* Progress Indicator */}
                    <ProgressBar
                        isGenerating={generating}
                        stage={generationProgress.stage}
                        message={generationProgress.message}
                        percentage={generationProgress.percentage}
                    />
                </div>
            </div>
        </div>
    );
};

export default QuizForm;
