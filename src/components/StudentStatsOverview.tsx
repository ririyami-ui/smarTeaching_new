import React from 'react';
import { AlertTriangle, Scale, GraduationCap, ShieldAlert, Trophy, Calendar } from 'lucide-react';
import StyledSelect from './StyledSelect';
import SummaryCard from './SummaryCard';
import { StudentStats, ClassAgreement } from '../types/studentTypes';

interface StudentStatsOverviewProps {
    stats: StudentStats;
    selectedSubject: string;
    setSelectedSubject: (val: string) => void;
    availableSubjects: string[];
    filteredGrades: unknown[];
    classAgreement: ClassAgreement | null;
    selectedClass: string;
    academicWeight: number;
    attitudeWeight: number;
}

const StudentStatsOverview: React.FC<StudentStatsOverviewProps> = ({
    stats,
    selectedSubject,
    setSelectedSubject,
    availableSubjects,
    filteredGrades,
    classAgreement,
    selectedClass,
    academicWeight,
    attitudeWeight
}) => {
    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
                {stats.warnings.length > 0 ? (
                    <div className="flex-1 w-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
                        <div className="p-2 bg-red-100 dark:bg-red-800 rounded-xl text-red-600 dark:text-red-400">
                            <AlertTriangle size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Peringatan Siswa Bermasalah</p>
                            <p className="text-xs text-red-500 dark:text-red-400 opacity-80">{stats.warnings.join(' • ')}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 hidden md:block" />
                )}
                <div className="w-full md:w-64">
                    <StyledSelect
                        value={selectedSubject}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSubject(e.target.value)}
                    >
                        <option value="">Semua Mata Pelajaran</option>
                        {availableSubjects.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                        ))}
                    </StyledSelect>
                </div>
            </div>

            {/* Class Agreement Display */}
            {classAgreement?.agreements && (
                <div className="card-glass p-5 flex items-start gap-4 animate-in fade-in duration-700">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-xl text-purple-600">
                        <Scale size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">Kesepakatan Kelas {selectedClass}</p>
                        <div className="text-xs text-purple-800 dark:text-purple-300 whitespace-pre-line leading-relaxed font-medium">
                            {classAgreement.agreements}
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title={selectedSubject && !/^[a-zA-Z0-9]{16,}$/.test(selectedSubject) ? `Rata-rata ${selectedSubject}` : "Rata-rata Akademik"}
                    value={stats.academicAvg}
                    icon={<GraduationCap className="w-8 h-8 text-blue-500" />}
                    color="blue"
                    subtitle={`Berdasarkan ${filteredGrades.length} penilaian`}
                />
                <SummaryCard
                    title={`Nilai Sikap (${stats.attitudePredicate})`}
                    value={stats.attitudeScore}
                    icon={<ShieldAlert className="w-8 h-8 text-emerald-500" />}
                    color="green"
                    subtitle={`Evidence: ${stats.totalStars} Bintang (+) | ${stats.totalInfractionPoints} Poin (-)`}
                />
                <SummaryCard
                    title={`Nilai Akhir (${academicWeight}/${attitudeWeight})`}
                    value={stats.finalScore}
                    icon={<Trophy className="w-8 h-8 text-purple-500" />}
                    color="purple"
                    subtitle={`(${academicWeight}% Akad + ${attitudeWeight}% Sikap)`}
                />
                <SummaryCard
                    title="Kehadiran"
                    value={stats.attendance.Hadir}
                    icon={<Calendar className="w-8 h-8 text-amber-500" />}
                    color="yellow"
                    subtitle={`S: ${stats.attendance.Sakit} | I: ${stats.attendance.Ijin} | A: ${stats.attendance.Alpha}`}
                />
            </div>
        </div>
    );
};

export default StudentStatsOverview;


