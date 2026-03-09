import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Calendar, Users, TrendingUp, FileDown, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

import StyledInput from './StyledInput';
import StyledSelect from './StyledSelect';
import StyledButton from './StyledButton';
import StyledTable from './StyledTable';
import SummaryCard from './SummaryCard';
import EmptyState from './EmptyState';
import QuickDateFilter from './QuickDateFilter';
import LoadingSpinner from './LoadingSpinner';
import { generateDetailedAttendanceRecapPDF } from '../utils/pdfGenerator';

const RekapAttendanceTab = ({
    classes,
    subjects,
    userProfile,
    schoolName,
    teacherName
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [dailyTab, setDailyTab] = useState('rangkuman'); // 'rangkuman' or 'harian'

    // State
    const [students, setStudents] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedAttendanceSubject, setSelectedAttendanceSubject] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [attendanceData, setAttendanceData] = useState([]);
    const [attendanceDates, setAttendanceDates] = useState([]);
    const [chartData, setChartData] = useState({ Hadir: 0, Sakit: 0, Ijin: 0, Alpha: 0 });
    const [numDays, setNumDays] = useState(0);
    const [dailyAttendanceData, setDailyAttendanceData] = useState([]);

    useEffect(() => {
        const fetchStudents = async () => {
            if (selectedClass && auth.currentUser) {
                const q = query(
                    collection(db, 'students'),
                    where('userId', '==', auth.currentUser.uid),
                    where('classId', '==', selectedClass)
                );
                const snapshot = await getDocs(q);
                const fetchedStudents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => (parseInt(a.absen) || 0) - (parseInt(b.absen) || 0));
                setStudents(fetchedStudents);
            } else {
                setStudents([]);
            }
        };
        fetchStudents();
    }, [selectedClass]);

    const handleApplyFilter = async () => {
        if (!startDate || !endDate || !selectedClass) {
            toast.error('Silakan pilih rentang tanggal dan kelas.');
            return;
        }
        setIsLoading(true);
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const timeDiff = end.getTime() - start.getTime();
            const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
            setNumDays(dayDiff);

            let attendanceQuery = query(
                collection(db, 'attendance'),
                where('userId', '==', auth.currentUser.uid),
                where('classId', '==', selectedClass),
                where('date', '>=', startDate),
                where('date', '<=', endDate)
            );

            const snapAtt = await getDocs(attendanceQuery);
            let rawDocs = snapAtt.docs.map(doc => doc.data());

            if (selectedAttendanceSubject) {
                rawDocs = rawDocs.filter(doc => doc.subjectId === selectedAttendanceSubject);
            }

            let summary = {};
            students.forEach(student => {
                summary[student.id] = { absen: student.absen, nis: student.nis, name: student.name, Hadir: 0, Sakit: 0, Ijin: 0, Alpha: 0 };
            });

            rawDocs.forEach(record => {
                if (summary[record.studentId] && record.status) {
                    summary[record.studentId][record.status]++;
                    summary[record.studentId][record.date] = record.status;
                }
            });

            const uniqueDates = Array.from(new Set(rawDocs.map(doc => doc.date))).sort();
            const realSchoolDays = uniqueDates.length > 0 ? uniqueDates.length : dayDiff;
            setNumDays(realSchoolDays);
            setAttendanceDates(uniqueDates);

            const tableData = Object.values(summary);
            setAttendanceData(tableData);
            const totalSummary = tableData.reduce((acc, curr) => {
                acc.Hadir += curr.Hadir;
                acc.Sakit += curr.Sakit;
                acc.Ijin += curr.Ijin;
                acc.Alpha += curr.Alpha;
                return acc;
            }, { Hadir: 0, Sakit: 0, Ijin: 0, Alpha: 0 });

            setChartData({
                ...totalSummary,
                schoolDays: realSchoolDays,
                studentCount: students.length
            });

            const dailyDataMap = {};
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
                    if (record.status === 'Hadir') dailyDataMap[record.date].hadir++;
                    else if (record.status === 'Sakit') dailyDataMap[record.date].sakit++;
                    else if (record.status === 'Ijin') dailyDataMap[record.date].ijin++;
                    else if (record.status === 'Alpha') dailyDataMap[record.date].alpha++;

                    dailyDataMap[record.date].students.push({
                        name: student.name,
                        absen: student.absen,
                        status: record.status
                    });
                }
            });

            const dailyDataArray = Object.values(dailyDataMap).sort((a, b) => new Date(b.date) - new Date(a.date));
            dailyDataArray.forEach(day => {
                day.students.sort((a, b) => (a.absen || 0) - (b.absen || 0));
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

    const handleExcelExport = () => {
        if (attendanceData.length === 0) {
            toast.error('Tidak ada data kehadiran untuk diekspor ke Excel.');
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(attendanceData.map(item => ({
            'No. Absen': item.absen || '',
            'NIS': item.nis || '',
            'Nama Siswa': item.name || '',
            'Hadir': item.Hadir || 0,
            'Sakit': item.Sakit || 0,
            'Ijin': item.Ijin || 0,
            'Alpha': item.Alpha || 0,
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Kehadiran');
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const classObj = classes.find(c => c.id === selectedClass);
        saveAs(data, `Rekapitulasi_Kehadiran_\${classObj?.rombel || selectedClass}_\${startDate}_\${endDate}.xlsx`);
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
                    <QuickDateFilter onSelect={(start, end) => { setStartDate(start); setEndDate(end); }} />
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
                                                        <span className={row[col.accessor] > 0 ? (col.accessor === 'Hadir' ? 'text-green-600 font-bold' : 'text-red-500 font-medium') : ''}>
                                                            {row[col.accessor]}
                                                        </span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </StyledTable>
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
                                                        {dayData.students.map((student, idx) => (
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
