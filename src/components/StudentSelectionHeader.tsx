import React from 'react';
import { ArrowLeft, User, MapPin, RefreshCw, Loader2 } from 'lucide-react';
import StyledSelect from './StyledSelect';

interface ClassData {
  id: string;
  rombel: string;
}

interface StudentData {
  id: string;
  name: string;
}

interface StudentSelectionHeaderProps {
    navigate: (delta: number) => void;
    signingLocation: string;
    setSigningLocation: (val: string) => void;
    handleDetectLocation: () => void;
    isDetectingLocation: boolean;
    selectedClass: string;
    setSelectedClass: (val: string) => void;
    setFlaggedClassFilter: (val: string) => void;
    setSelectedStudentId: (val: string) => void;
    classes: ClassData[];
    selectedStudentId: string;
    isFetchingStudents: boolean;
    students: StudentData[];
}

const StudentSelectionHeader: React.FC<StudentSelectionHeaderProps> = ({
    navigate,
    signingLocation,
    setSigningLocation,
    handleDetectLocation,
    isDetectingLocation,
    selectedClass,
    setSelectedClass,
    setFlaggedClassFilter,
    setSelectedStudentId,
    classes,
    selectedStudentId,
    isFetchingStudents,
    students
}) => {
    return (
        <div className="card-glass p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-2xl transition-all active:scale-95"
                    >
                        <ArrowLeft className="text-gray-600 dark:text-gray-300" size={24} />
                    </button>
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                        <User className="text-blue-600 dark:text-blue-400" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 dark:text-white">Rekap Individu Siswa</h1>
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg w-fit">
                            <MapPin size={12} className="text-blue-500" />
                            <span>Lokasi TTD:</span>
                            <input
                                type="text"
                                className="bg-transparent focus:outline-none min-w-[80px] normal-case border-b border-transparent focus:border-blue-500/30 transition-all"
                                value={signingLocation}
                                onChange={(e) => {
                                    setSigningLocation(e.target.value);
                                    localStorage.setItem('SIGNING_LOCATION', e.target.value);
                                }}
                                placeholder="Kota..."
                            />
                            <button
                                onClick={handleDetectLocation}
                                disabled={isDetectingLocation}
                                className="hover:text-blue-500 transition-colors"
                            >
                                {isDetectingLocation ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 min-w-[300px]">
                    <StyledSelect value={selectedClass} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const val = e.target.value;
                        setSelectedClass(val);
                        setFlaggedClassFilter(val);
                        setSelectedStudentId('');
                    }}>
                        <option value="">Pilih Kelas</option>
                        {classes.map(c => <option key={c.id} value={c.rombel}>{c.rombel}</option>)}
                    </StyledSelect>
                    <StyledSelect
                        value={selectedStudentId}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStudentId(e.target.value)}
                        disabled={!selectedClass || isFetchingStudents}
                    >
                        <option value="">{isFetchingStudents ? 'Memuat siswa...' : 'Pilih Siswa'}</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </StyledSelect>
                </div>
            </div>
        </div>
    );
};

export default StudentSelectionHeader;

