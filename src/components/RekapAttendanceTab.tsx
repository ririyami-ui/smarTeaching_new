import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { saveAs } from 'file-saver';
import { Calendar, Users, TrendingUp, FileDown, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

import StyledInput from './StyledInput';
import StyledSelect from './StyledSelect';
import StyledButton from './StyledButton';
import StyledTable from './StyledTable';
import SummaryCard from './SummaryCard';
import EmptyState from './EmptyState';
import QuickDateFilter from './QuickDateFilter';
import LoadingSpinner from './LoadingSpinner';
import { generateDetailedAttendanceRecapPDF } from '../utils/pdfGenerator';
import { UserProfile } from '../types';

interface ClassItem {
  id: string;
  rombel: string;
}

interface SubjectItem {
  id: string;
  name: string;
}

interface RekapAttendanceTabProps {
    classes: ClassItem[];
    subjects: SubjectItem[];
    userProfile: UserProfile | null;
    schoolName: string;
    teacherName: string;
    activeSemester: string;
    academicYear: string;
}

const RekapAttendanceTab: React.FC<RekapAttendanceTabProps> = ({
    classes,
    subjects,
    userProfile,
    schoolName,
    teacherName,
    activeSemester,
    academicYear
}) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [dailyTab, setDailyTab] = useState('rangkuman'); // 'rangkuman' or 'harian'

    interface StudentDoc {
        id: string;
        name: string;
        absen?: string;
        nis?: string;
    }

    interface AttendanceSummary {
        absen?: string;
        nis?: string;
        name: string;
        Hadir: number;
        Sakit: number;
        Ijin: number;
        Alpha: number;
        [key: string]: string | number | undefined;
    }

    interface ChartData {
        Hadir: number;
        Sakit: number;
        Ijin: number;
        Alpha: number;
        schoolDays: number;
        studentCount: number;
    }

    interface DailyStudent {
        name: string;
        absen?: string;
        status: string;
    }

    interface DailyAttendance {
        date: string;
        hadir: number;
        sakit: number;
        ijin: number;
        alpha: number;
        total: number;
        students: DailyStudent[];
    }

    // State
    const [students, setStudents] = useState<StudentDoc[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedAttendanceSubject, setSelectedAttendanceSubject] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [attendanceData, setAttendanceData] = useState<AttendanceSummary[]>([]);
    const [attendanceDates, setAttendanceDates] = useState<string[]>([]);
    const [chartData, setChartData] = useState<ChartData>({ Hadir: 0, Sakit: 0, Ijin: 0, Alpha: 0, schoolDays: 0, studentCount: 0 });
    const [numDays, setNumDays] = useState(0);
    const [dailyAttendanceData, setDailyAttendanceData] = useState<DailyAttendance[]>([]);

    useEffect(() => {
        const fetchStudents = async () => {
            if (selectedClass && user) {
                const q = query(
                    collection(db, 'students'),
                    where('userId', '==', user?.uid || ''),
                    where('classId', '==', selectedClass)
                );
                const snapshot = await getDocs(q);
                const fetchedStudents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentDoc))
                    .sort((a: StudentDoc, b: StudentDoc) => (Number(a.absen) || 0) - (Number(b.absen) || 0));
                setStudents(fetchedStudents);
            } else {
                setStudents([]);
            }
        };
        fetchStudents();
    }, [selectedClass, user]);

    const handleApplyFilter = async () => {
        if (!selectedClass) {
            toast.error('Silakan pilih kelas.');
            return;
        }
        setIsLoading(true);
        try {


            let queryConstraints = [
                where('userId', '==', user?.uid || '')
            ];
            // Apply date range only when both dates are provided and semester filter is not active
            if (startDate && endDate && !(activeSemester && academicYear)) {
                queryConstraints.push(where('date', '>=', startDate));
                queryConstraints.push(where('date', '<=', endDate));
            }
            const attendanceQuery = query(collection(db, 'attendance'), ...queryConstraints);

            const snapAtt = await getDocs(attendanceQuery);
            let rawDocs = snapAtt.docs.map(doc => doc.data());

            if (activeSemester && academicYear) {
                rawDocs = rawDocs.filter(doc => doc.semester === activeSemester && doc.academicYear === academicYear);
            }

            // In-memory filter to ensure records belong to students in this class
            const studentIdsInClass = new Set(students.map(s => s.id));
            rawDocs = rawDocs.filter(doc => studentIdsInClass.has(doc.studentId));

            if (selectedAttendanceSubject) {
                const sel = selectedAttendanceSubject.trim().toLowerCase();
                const targetSubject = subjects.find(s => s.id.trim().toLowerCase() === sel || s.name.trim().toLowerCase() === sel);
                const targetName = targetSubject ? targetSubject.name.trim().toLowerCase() : sel;
                const targetId = targetSubject ? targetSubject.id.trim().toLowerCase() : sel;

                rawDocs = rawDocs.filter(doc => {
                    const idMatch = doc.subjectId && doc.subjectId.trim().toLowerCase() === targetId;
                    const nameMatch = doc.subjectName && doc.subjectName.trim().toLowerCase() === targetName;
                    return idMatch || nameMatch;
                });
            }

            const summary: Record<string, AttendanceSummary> = {};
            students.forEach(student => {
                summary[student.id] = { absen: student.absen, nis: student.nis, name: student.name, Hadir: 0, Sakit: 0, Ijin: 0, Alpha: 0 };
            });

            rawDocs.forEach(record => {
                if (summary[record.studentId] && record.status) {
                    const statusNorm = (record.status || '').trim().toLowerCase();
                    let key;
                    if (statusNorm === 'hadir') key = 'Hadir';
                    else if (statusNorm === 'sakit') key = 'Sakit';
                    else if (statusNorm === 'ijin' || statusNorm === 'izin') key = 'Ijin';
                    else if (statusNorm === 'alpha') key = 'Alpha';

                    if (key && summary[record.studentId]) {
                        summary[record.studentId][key] = (summary[record.studentId][key] as number || 0) + 1;
                        summary[record.studentId][record.date] = key;
                    }
                }
            });

            const uniqueDates = Array.from(new Set(rawDocs.map(doc => doc.date))).sort();
            const realSchoolDays = uniqueDates.length;
            setNumDays(realSchoolDays);
            setAttendanceDates(uniqueDates);

            const tableData = Object.values(summary);
            setAttendanceData(tableData);
            const totalSummary = tableData.reduce((acc: ChartData, curr: AttendanceSummary) => {
                acc.Hadir += curr.Hadir;
                acc.Sakit += curr.Sakit;
                acc.Ijin += curr.Ijin;
                acc.Alpha += curr.Alpha;
                return acc;
            }, { Hadir: 0, Sakit: 0, Ijin: 0, Alpha: 0, schoolDays: 0, studentCount: 0 });

            setChartData({
                ...totalSummary,
                schoolDays: realSchoolDays,
                studentCount: students.length
            });

            const dailyDataMap: Record<string, DailyAttendance> = {};
            rawDocs.forEach(record => {
                if (!dailyDataMap[record.date]) {
                    dailyDataMap[record.date] = {
                        date: record.date,
                        hadir: 0,
                        sakit: 0,
                        ijin: 0,
                        alpha: 0,
                        total: 0,
                        students: []
                    };
                }

                const student = students.find(s => s.id === record.studentId);
                if (student) {
                    dailyDataMap[record.date].total++;
                    const statusNorm = (record.status || '').trim().toLowerCase();
                    let key = record.status;
                    if (statusNorm === 'hadir') { dailyDataMap[record.date].hadir++; key = 'Hadir'; }
                    else if (statusNorm === 'sakit') { dailyDataMap[record.date].sakit++; key = 'Sakit'; }
                    else if (statusNorm === 'ijin' || statusNorm === 'izin') { dailyDataMap[record.date].ijin++; key = 'Ijin'; }
                    else if (statusNorm === 'alpha') { dailyDataMap[record.date].alpha++; key = 'Alpha'; }

                    dailyDataMap[record.date].students.push({
                        name: student.name,
                        absen: student.absen,
                        status: key
                    });
                }
            });

            const dailyDataArray = Object.values(dailyDataMap).sort((a: DailyAttendance, b: DailyAttendance) => new Date(b.date).getTime() - new Date(a.date).getTime());
            dailyDataArray.forEach((day: DailyAttendance) => {
                day.students.sort((a: DailyStudent, b: DailyStudent) => (Number(a.absen) || 0) - (Number(b.absen) || 0));
            });

            setDailyAttendanceData(dailyDataArray);
        } catch (error) {
            console.error("Error fetching attendance:", error);
            toast.error('Gagal mengambil data kehadiran.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePDFExport = () => {
        if (attendanceData.length === 0) {
            toast.error('Tidak ada data kehadiran untuk diekspor ke PDF.');
            return;
        }
        const classObj = classes.find(c => c.id === selectedClass);
        const subjectObj = subjects.find(s => s.id === selectedAttendanceSubject);
        generateDetailedAttendanceRecapPDF(
            attendanceData,
            attendanceDates,
            schoolName,
            startDate,
            endDate,
            teacherName,
            classObj?.rombel || selectedClass,
            userProfile,
            subjectObj?.name || selectedAttendanceSubject
        );
    };

    const handleExcelExport = async () => {
        if (!attendanceData || attendanceData.length === 0) {
            toast.error('Tidak ada data kehadiran untuk diekspor ke Excel.');
            return;
        }

        const toastId = toast.loading('Menyiapkan file Excel...');
        try {
            const XLSX = await import('xlsx');
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Kehadiran');
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(data, `Rekapitulasi_Kehadiran_${selectedClass}_${startDate}_${endDate}.xlsx`);
        } catch (error) {
            console.error('Excel Export Error:', error);
            toast.error('Gagal mengekspor data ke Excel.', { id: toastId });
        }
    };


    const kehadiranColumns = [
        { header: { label: 'Nama Siswa' }, accessor: 'name' },
        { header: { label: 'Hadir' }, accessor: 'Hadir' },
        { header: { label: 'Sakit' }, accessor: 'Sakit' },
        { header: { label: 'Ijin' }, accessor: 'Ijin' },
        { header: { label: 'Alpha' }, accessor: 'Alpha' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 items-end">
                    <div className="xl:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mata Pelajaran</label>
                        <StyledSelect value={selectedAttendanceSubject} onChange={(e) => setSelectedAttendanceSubject(e.target.value)}>
                            <option value="">-- Semua Mapel --</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </StyledSelect>
                    </div>
                    <div className="xl:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Pilih Kelas</label>
                        <StyledSelect value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                            <option value="">-- Pilih Kelas --</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.rombel}</option>)}
                        </StyledSelect>
                    </div>
                    <div className="md:col-span-2 xl:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rentang Tanggal</label>
                        <div className="flex items-center gap-2">
                            <StyledInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            <span className="text-gray-400">-</span>
                            <StyledInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="md:col-span-2 xl:col-span-3 flex gap-2">
                        <StyledButton onClick={handleApplyFilter} className="flex-1">
                            Terapkan Filter
                        </StyledButton>
                        {attendanceData.length > 0 && (
                            <div className="flex gap-2">
                                <StyledButton onClick={handlePDFExport} className="bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-900/30">
                                    <FileDown className="w-5 h-5" />
                                </StyledButton>
                                <StyledButton onClick={handleExcelExport} className="bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 border-green-100 dark:border-green-900/30">
                                    <FileDown className="w-5 h-5" />
                                </StyledButton>
                            </div>
                        )}
                    </div>
                </div>
                <div className="mt-4">
                    <QuickDateFilter onSelect={(start: string, end: string) => { setStartDate(start); setEndDate(end); }} />
                </div>
            </div>

            {isLoading ? (
                <div className="py-20"><LoadingSpinner label="Memuat data kehadiran..." /></div>
            ) : attendanceData.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryCard title="Hadir" value={chartData.Hadir} icon={<CheckCircle className="w-8 h-8 text-green-500" />} color="green" />
                        <SummaryCard title="Sakit" value={chartData.Sakit} icon={<TrendingUp className="w-8 h-8 text-blue-500" />} color="blue" />
                        <SummaryCard title="Ijin" value={chartData.Ijin} icon={<Calendar className="w-8 h-8 text-yellow-500" />} color="yellow" />
                        <SummaryCard title="Alpha" value={chartData.Alpha} icon={<AlertTriangle className="w-8 h-8 text-red-500" />} color="red" />
                    </div>

                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit mb-4">
                        <button
                            className={`py-2 px-4 rounded-md font-medium text-sm transition \${dailyTab === 'rangkuman'
                ? 'bg-white dark:bg-surface-dark text-primary shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                            onClick={() => setDailyTab('rangkuman')}
                        >
                            Rangkuman
                        </button>
                        <button
                            className={`py-2 px-4 rounded-md font-medium text-sm transition \${dailyTab === 'harian'
                ? 'bg-white dark:bg-surface-dark text-primary shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                            onClick={() => setDailyTab('harian')}
                        >
                            Rekap Harian
                        </button>
                    </div>

                    {dailyTab === 'rangkuman' ? (
                        <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Rangkuman Kehadiran per Siswa</h3>
                                <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">Total {numDays} Hari</span>
                            </div>
                            <div className="overflow-x-auto">
                                <StyledTable headers={kehadiranColumns.map(c => c.header)}>
                                    {attendanceData.map((row, index) => (
                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            {kehadiranColumns.map(col => (
                                                <td key={col.accessor} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 border-b border-gray-50 dark:border-gray-800">
                                                    {col.accessor === 'name' ? (
                                                        <div className="font-semibold text-gray-900 dark:text-white">{row[col.accessor]}</div>
                                                    ) : (
                                                        <span className={Number(row[col.accessor]) > 0 ? (col.accessor === 'Hadir' ? 'text-green-600 font-bold' : 'text-red-500 font-medium') : ''}>
                                                            {row[col.accessor]}
                                                        </span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                                            TOTAL
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 border-b border-gray-200 dark:border-gray-600">
                                            {chartData.Hadir}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 border-b border-gray-200 dark:border-gray-600">
                                            {chartData.Sakit}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 dark:text-yellow-400 border-b border-gray-200 dark:border-gray-600">
                                            {chartData.Ijin}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400 border-b border-gray-200 dark:border-gray-600">
                                            {chartData.Alpha}
                                        </td>
                                    </tr>
                                </StyledTable>
                            </div>
                            <div className="p-6 border-t border-gray-100 dark:border-gray-800">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Visualisasi Persentase Kehadiran</h4>
                                <div className="flex justify-center">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Hadir', value: chartData.Hadir },
                                                    { name: 'Sakit', value: chartData.Sakit },
                                                    { name: 'Ijin', value: chartData.Ijin },
                                                    { name: 'Alpha', value: chartData.Alpha }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                <Cell fill="#22c55e" />
                                                <Cell fill="#3b82f6" />
                                                <Cell fill="#eab308" />
                                                <Cell fill="#ef4444" />
                                            </Pie>
                                            <Tooltip formatter={(value) => `${value}`} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Rekap Kehadiran per Tanggal</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Melihat kehadiran siswa setiap hari pada periode yang dipilih</p>
                            </div>
                            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                {dailyAttendanceData.length > 0 ? (
                                    <div className="p-6 space-y-4">
                                        {dailyAttendanceData.map((dayData, index) => (
                                            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 dark:text-white">{dayData.date}</h4>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                            Total: {dayData.total} siswa
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-4 text-sm">
                                                        <span className="text-green-600 font-semibold">✓ {dayData.hadir}</span>
                                                        <span className="text-blue-600">S {dayData.sakit}</span>
                                                        <span className="text-yellow-600">I {dayData.ijin}</span>
                                                        <span className="text-red-600">A {dayData.alpha}</span>
                                                    </div>
                                                </div>
                                                <div className="p-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {dayData.students.map((student: DailyStudent, idx: number) => (
                                                            <div
                                                                key={idx}
                                                                className={`p-3 rounded-lg border text-sm \${student.status === 'Hadir'
                                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                  : student.status === 'Sakit'
                                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                                    : student.status === 'Ijin'
                                      ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                                      : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                                  }`}
                                                            >
                                                                <div className="font-semibold text-gray-900 dark:text-white truncate">{student.name}</div>
                                                                <div className="flex items-center justify-between mt-1">
                                                                    <span className="text-xs text-gray-600 dark:text-gray-400">Absen {student.absen}</span>
                                                                    <span
                                                                        className={`text-xs font-bold \${student.status === 'Hadir'
                                      ? 'text-green-600'
                                      : student.status === 'Sakit'
                                        ? 'text-blue-600'
                                        : student.status === 'Ijin'
                                          ? 'text-yellow-600'
                                          : 'text-red-600'
                                      }`}
                                                                    >
                                                                        {student.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                                        Tidak ada data kehadiran harian.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <EmptyState
                    title="Belum ada data kehadiran"
                    description="Silakan pilih kelas dan rentang tanggal lalu klik Terapkan Filter."
                    icon={<Users className="w-16 h-16 text-gray-300" />}
                />
            )}
        </div>
    );
};

export default RekapAttendanceTab;

