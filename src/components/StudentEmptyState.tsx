import React from 'react';
import { AlertCircle, UserSearch } from 'lucide-react';
import StyledSelect from './StyledSelect';

interface FlaggedStudent {
  id: string;
  name: string;
  rombel: string;
  classId: string;
  triggers?: string[];
  warnings?: string[];
}

interface ClassData {
  id: string;
  rombel: string;
}

interface StudentItem {
  id: string;
  name: string;
}

interface StudentEmptyStateProps {
    selectedClass: string;
    isFetchingStudents: boolean;
    students: StudentItem[];
    setSelectedStudentId: (val: string) => void;
    flaggedStudents: FlaggedStudent[];
    flaggedClassFilter: string;
    setFlaggedClassFilter: (val: string) => void;
    setSelectedClass: (val: string) => void;
    classes: ClassData[];
}

const StudentEmptyState: React.FC<StudentEmptyStateProps> = ({
    setSelectedStudentId,
    flaggedStudents,
    flaggedClassFilter,
    setFlaggedClassFilter,
    setSelectedClass,
    classes
}) => {
    return (
        // Menggunakan tata letak grid dua kolom yang responsif di desktop agar menghemat ruang vertikal layar
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-8 px-4 items-center max-w-6xl mx-auto animate-in fade-in zoom-in duration-500">
            
            {/* Bagian Kiri: Area Sambutan Hero */}
            <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
                <div className="relative">
                    {/* Lingkaran ikon dengan efek denyut lembut */}
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center animate-pulse">
                        <UserSearch className="text-blue-600 dark:text-blue-400" size={40} />
                    </div>
                    {/* Lencana peringatan kecil dengan efek memantul */}
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 card-glass rounded-full flex items-center justify-center shadow-md border border-gray-100 dark:border-gray-700">
                        <AlertCircle className="text-amber-500 animate-bounce" size={18} />
                    </div>
                </div>
                <div>
                    <h2 className="text-2xl lg:text-3xl font-black text-gray-800 dark:text-white mb-2 leading-tight">Siap Analisis Hari Ini?</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-sm">
                        Silakan pilih siswa dari menu pilihan di atas, atau klik nama siswa pada panel radar deteksi dini di sebelah kanan untuk memulai analisis data.
                    </p>
                </div>
            </div>

            {/* Bagian Kanan: Panel Radar EWS Siswa Perlu Perhatian */}
            <div className="lg:col-span-7 w-full bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl text-red-600">
                        <AlertCircle size={20} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-base font-bold text-gray-800 dark:text-white leading-tight">Radar Siswa Perlu Perhatian</h3>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Early Warning System (EWS)</p>
                    </div>
                </div>

                {/* Filter Pilihan Kelas EWS */}
                <div className="mb-4">
                    <StyledSelect 
                        value={flaggedClassFilter} 
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            const val = e.target.value;
                            setFlaggedClassFilter(val);
                            setSelectedClass(val);
                        }}
                    >
                        <option value="">Semua Kelas Terdeteksi</option>
                        {classes.map(c => <option key={c.id} value={c.rombel}>{c.rombel}</option>)}
                    </StyledSelect>
                </div>

                {/* Daftar Grid Siswa Bermasalah yang Terdeteksi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[250px] overflow-y-auto custom-scrollbar p-1">
                    {flaggedStudents
                        .filter(s => !flaggedClassFilter || s.rombel === flaggedClassFilter)
                        .map(s => (
                            <button
                                key={s.id}
                                onClick={() => {
                                    setSelectedClass(s.rombel);
                                    setSelectedStudentId(s.id);
                                }}
                                className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl border border-gray-100 dark:border-gray-800 transition-all text-left group"
                            >
                                <div className="flex-1 min-w-0 pr-2">
                                    <p className="font-bold text-gray-800 dark:text-white text-xs group-hover:text-blue-600 transition-colors uppercase truncate">{s.name}</p>
                                    <p className="text-[9px] text-gray-400 font-bold mt-0.5">{s.rombel} • {(s.warnings || s.triggers || []).length} Indikator</p>
                                </div>
                                <div className="p-1.5 card-glass rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 group-hover:border-blue-200 flex-shrink-0">
                                    <AlertCircle size={12} className="text-red-500" />
                                </div>
                            </button>
                        ))}
                    
                    {flaggedStudents.filter(s => !flaggedClassFilter || s.rombel === flaggedClassFilter).length === 0 && (
                        <div className="col-span-2 py-8 text-xs text-gray-400 italic text-center">
                            Tidak ada siswa yang terdeteksi memerlukan perhatian khusus di kelas ini.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentEmptyState;

