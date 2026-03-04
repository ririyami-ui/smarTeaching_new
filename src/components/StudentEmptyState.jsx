import React from 'react';
import { Search, GraduationCap, User, AlertTriangle } from 'lucide-react';
import StyledSelect from './StyledSelect';

const StudentEmptyState = ({
    selectedClass,
    isFetchingStudents,
    students,
    setSelectedStudentId,
    flaggedStudents,
    flaggedClassFilter,
    setFlaggedClassFilter,
    setSelectedClass,
    classes
}) => {
    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-12 rounded-[3rem] text-center shadow-xl">
                <Search size={64} className="text-blue-500/20 mx-auto mb-6" />
                <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">
                    {selectedClass ? `Siswa Kelas ${selectedClass}` : 'Pilih Siswa untuk Rekap'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                    {selectedClass ? 'Klik pada nama siswa di bawah untuk melihat rekap detail' : 'Pilih kelas dan nama siswa di atas untuk melihat rekap lengkap'}
                </p>
            </div>

            {/* All Students Grid (shown when class selected) */}
            {selectedClass && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600">
                            <GraduationCap size={20} />
                        </div>
                        <h2 className="text-xl font-black text-gray-800 dark:text-white">
                            {isFetchingStudents ? 'Memuat daftar siswa...' : `Daftar Siswa (${students.length})`}
                        </h2>
                    </div>

                    {isFetchingStudents ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-pulse">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
                            ))}
                        </div>
                    ) : students.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {students.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setSelectedStudentId(s.id)}
                                    className="bg-white/60 dark:bg-gray-800/60 p-4 rounded-2xl border border-transparent hover:border-blue-500 hover:scale-105 transition-all text-center shadow-md group"
                                >
                                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <User size={20} />
                                    </div>
                                    <p className="text-xs font-bold text-gray-800 dark:text-white truncate">{s.name}</p>
                                    <p className="text-[10px] text-gray-500">{s.nis || 'No NIS'}</p>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-10 bg-gray-50 dark:bg-gray-900/30 rounded-3xl text-center border-2 border-dashed border-gray-200 dark:border-gray-800">
                            <p className="text-gray-500 font-medium">Tidak ada siswa yang ditemukan di kelas {selectedClass}.</p>
                            <p className="text-xs text-gray-400 mt-1">Pastikan data rombel siswa di Master Data sudah sesuai.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Flagged Students Section */}
            {flaggedStudents.length > 0 && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl text-red-600">
                                <AlertTriangle size={20} />
                            </div>
                            <h2 className="text-xl font-black text-gray-800 dark:text-white">
                                {selectedClass ? `Siswa Perlu Perhatian (Kelas ${selectedClass})` : 'Siswa Perlu Perhatian Segera'}
                            </h2>
                        </div>
                        {!selectedClass && (
                            <div className="w-full sm:w-48">
                                <StyledSelect
                                    value={flaggedClassFilter}
                                    onChange={(e) => setFlaggedClassFilter(e.target.value)}
                                    className="!py-2 !text-xs"
                                >
                                    <option value="">Semua Kelas</option>
                                    {classes.map(c => <option key={c.id} value={c.rombel}>{c.rombel}</option>)}
                                </StyledSelect>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {flaggedStudents
                            .filter(s => !flaggedClassFilter || s.rombel === flaggedClassFilter)
                            .map(student => (
                                <button
                                    key={student.id}
                                    onClick={() => {
                                        setSelectedClass(student.rombel);
                                        setSelectedStudentId(student.id);
                                    }}
                                    className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-5 rounded-3xl border-l-4 border-red-500 text-left hover:scale-[1.02] transition-all shadow-lg group"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-black text-gray-800 dark:text-white group-hover:text-red-500 transition-colors uppercase truncate mr-2">{student.name}</h3>
                                        <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 uppercase">{student.rombel}</span>
                                    </div>
                                    <div className="space-y-1">
                                        {student.warnings.map((w, idx) => (
                                            <p key={idx} className="text-[10px] text-red-500/80 font-medium flex items-center gap-1">
                                                <span className="w-1 h-1 bg-red-400 rounded-full" /> {w}
                                            </p>
                                        ))}
                                    </div>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Detail Rekap →</span>
                                        {student.totalPointsDeducted > 0 && (
                                            <span className="text-[10px] font-bold text-gray-400">-{student.totalPointsDeducted} Poin Pelanggaran</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentEmptyState;
