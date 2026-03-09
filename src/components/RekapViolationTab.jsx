import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { AlertCircle, FileDown, ShieldAlert, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';

import StyledInput from './StyledInput';
import StyledSelect from './StyledSelect';
import StyledButton from './StyledButton';
import StyledTable from './StyledTable';
import SummaryCard from './SummaryCard';
import EmptyState from './EmptyState';
import QuickDateFilter from './QuickDateFilter';
import LoadingSpinner from './LoadingSpinner';
import { generateViolationRecapPDF } from '../utils/pdfGenerator';
import { calculateNilaiSikap, generateDeskripsi } from '../utils/generalUtils';

const RekapViolationTab = ({
    classes,
    schoolName,
    teacherName,
    userProfile
}) => {
    const [isLoading, setIsLoading] = useState(false);

    // State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [students, setStudents] = useState([]);
    const [violations, setViolations] = useState([]);
    const [recapData, setRecapData] = useState([]);
    const [violationStats, setViolationStats] = useState([]);

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
            const endDay = new Date(endDate);
            endDay.setHours(23, 59, 59, 999);

            const violationsQuery = query(
                collection(db, 'infractions'),
                where('userId', '==', auth.currentUser.uid),
                where('classId', '==', selectedClass),
                where('date', '>=', new Date(startDate).toISOString()),
                where('date', '<=', endDay.toISOString())
            );

            const querySnapshot = await getDocs(violationsQuery);
            const fetchedViolations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setViolations(fetchedViolations);

            const statsMap = fetchedViolations.reduce((acc, curr) => {
                acc[curr.infractionType] = (acc[curr.infractionType] || 0) + 1;
                return acc;
            }, {});
            setViolationStats(Object.entries(statsMap).map(([name, value]) => ({ name, value })));

            const studentRecap = {};
            students.forEach(student => {
                studentRecap[student.id] = {
                    absen: student.absen,
                    nis: student.nis,
                    name: student.name,
                    gender: student.gender,
                    violationCount: 0,
                    violationsDetail: [],
                };
            });

            fetchedViolations.forEach(violation => {
                if (studentRecap[violation.studentId]) {
                    studentRecap[violation.studentId].violationCount++;
                    studentRecap[violation.studentId].violationsDetail.push(violation);
                }
            });

            const finalRecapData = Object.values(studentRecap).map(data => {
                const totalPointsDeducted = data.violationsDetail.reduce((acc, curr) => acc + (curr.points || 0), 0);
                const currentScore = Math.max(0, 100 - totalPointsDeducted);
                const nilaiSikap = calculateNilaiSikap(currentScore);
                const deskripsi = generateDeskripsi(data.name, data.violationsDetail, currentScore, nilaiSikap);
                return {
                    ...data,
                    totalPointsDeducted,
                    currentScore,
                    nilaiSikap,
                    deskripsi,
                };
            }).sort((a, b) => a.absen - b.absen);

            setRecapData(finalRecapData);
        } catch (error) {
            console.error("Error fetching violations:", error);
            toast.error('Gagal mengambil data pelanggaran.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePDFExport = () => {
        if (recapData.length === 0) {
            toast.error('Tidak ada data pelanggaran untuk diekspor ke PDF.');
            return;
        }
        const classObj = classes.find(c => c.id === selectedClass);
        generateViolationRecapPDF(recapData, schoolName, startDate, endDate, teacherName, classObj?.rombel || selectedClass, userProfile);
    };

    const handleExcelExport = () => {
        if (recapData.length === 0) {
            toast.error('Tidak ada data pelanggaran untuk diekspor ke Excel.');
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(recapData.map(item => ({
            'No. Absen': item.absen,
            'NIS': item.nis,
            'Nama Siswa': item.name,
            'Total Pelanggaran': item.violationCount,
            'Total Poin (-)': item.totalPointsDeducted,
            'Skor Akhir': item.currentScore,
            'Nilai Sikap': item.nilaiSikap,
            'Deskripsi': item.deskripsi,
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Pelanggaran');
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const classObj = classes.find(c => c.id === selectedClass);
        saveAs(data, `Rekapitulasi_Pelanggaran_\${classObj?.rombel || selectedClass}_\${startDate}_\${endDate}.xlsx`);
    };

    const pelanggaranColumns = [
        { header: { label: 'No. Absen' }, accessor: 'absen' },
        { header: { label: 'Nama Siswa' }, accessor: 'name' },
        { header: { label: 'Jml Pelanggaran' }, accessor: 'violationCount' },
        { header: { label: 'Poin Dipotong' }, accessor: 'totalPointsDeducted' },
        { header: { label: 'Nilai Sikap' }, accessor: 'nilaiSikap' },
        { header: { label: 'Deskripsi' }, accessor: 'deskripsi' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                    <div className="lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Kelas</label>
                        <StyledSelect value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                            <option value="">-- Pilih Kelas --</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.rombel}</option>)}
                        </StyledSelect>
                    </div>
                    <div className="md:col-span-2 lg:col-span-5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rentang Tanggal</label>
                        <div className="flex items-center gap-2">
                            <StyledInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            <span className="text-gray-400">-</span>
                            <StyledInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="md:col-span-2 lg:col-span-4 flex gap-2">
                        <StyledButton onClick={handleApplyFilter} className="flex-1">
                            Terapkan Filter
                        </StyledButton>
                        {recapData.length > 0 && (
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
                <div className="py-20"><LoadingSpinner label="Menganalisis data disiplin..." /></div>
            ) : recapData.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <SummaryCard
                            title="Total Pelanggaran"
                            value={violationStats.reduce((acc, curr) => acc + curr.value, 0)}
                            icon={<ShieldAlert className="w-8 h-8 text-red-500" />}
                            color="red"
                        />
                        <SummaryCard
                            title="Siswa Terlibat"
                            value={recapData.filter(d => d.violationCount > 0).length}
                            icon={<AlertCircle className="w-8 h-8 text-orange-500" />}
                            color="orange"
                        />
                        <SummaryCard
                            title="Siswa Disiplin"
                            value={recapData.filter(d => d.violationCount === 0).length}
                            icon={<TrendingDown className="w-8 h-8 text-green-500" />}
                            color="green"
                        />
                    </div>

                    <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 overflow-hidden">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Catatan Kedisiplinan Siswa</h3>
                        <div className="overflow-x-auto">
                            <StyledTable headers={pelanggaranColumns.map(c => c.header)}>
                                {recapData.map((row, index) => (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        {pelanggaranColumns.map(col => (
                                            <td key={col.accessor} className="px-6 py-4 whitespace-normal text-sm text-gray-600 dark:text-gray-300 border-b border-gray-50 dark:border-gray-800">
                                                {col.accessor === 'name' ? (
                                                    <div className="font-semibold text-gray-900 dark:text-white">{row[col.accessor]}</div>
                                                ) : col.accessor === 'violationCount' ? (
                                                    <span className={row[col.accessor] > 0 ? 'text-red-600 font-bold' : ''}>
                                                        {row[col.accessor]}
                                                    </span>
                                                ) : col.accessor === 'deskripsi' ? (
                                                    <div className="min-w-[200px] whitespace-pre-wrap text-xs md:text-sm" title={row[col.accessor]}>{row[col.accessor]}</div>
                                                ) : (
                                                    row[col.accessor]
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </StyledTable>
                        </div>
                    </div>
                </>
            ) : (
                <EmptyState
                    title="Tidak ada data pelanggaran"
                    description="Pilih kelas dan periode pencatatan untuk melihat analisis kedisiplinan."
                    icon={<ShieldAlert className="w-16 h-16 text-gray-300" />}
                />
            )}
        </div>
    );
};

export default RekapViolationTab;
