import React, { useState } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Award, TrendingUp, FileDown, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

import StyledInput from './StyledInput';
import StyledSelect from './StyledSelect';
import StyledButton from './StyledButton';
import StyledTable from './StyledTable';
import SummaryCard from './SummaryCard';
import EmptyState from './EmptyState';
import QuickDateFilter from './QuickDateFilter';
import LoadingSpinner from './LoadingSpinner';
import { generateNilaiRecapPDF } from '../utils/pdfGenerator';
import { calculateNilaiSikap } from '../utils/generalUtils';

const RekapGradeTab = ({
    classes,
    subjects,
    userProfile,
    schoolName,
    teacherName,
    globalAcademicWeight,
    globalAttitudeWeight
}) => {
    const [isLoading, setIsLoading] = useState(false);

    // State
    const [nilaiStartDate, setNilaiStartDate] = useState('');
    const [nilaiEndDate, setNilaiEndDate] = useState('');
    const [selectedNilaiClass, setSelectedNilaiClass] = useState('');
    const [selectedNilaiSubject, setSelectedNilaiSubject] = useState('');
    const [nilaiData, setNilaiData] = useState([]);

    const handleApplyFilter = async () => {
        if (!nilaiStartDate || !nilaiEndDate || !selectedNilaiClass || !selectedNilaiSubject) {
            toast.error('Silakan pilih rentang tanggal, kelas, dan mata pelajaran.');
            return;
        }
        setIsLoading(true);
        try {
            // Fetch Students (ID-only)
            const studentsQuery = query(
                collection(db, 'students'),
                where('userId', '==', auth.currentUser.uid),
                where('classId', '==', selectedNilaiClass)
            );
            const studentSnap = await getDocs(studentsQuery);
            const fetchedStudents = studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => (parseInt(a.absen) || 0) - (parseInt(b.absen) || 0));

            // Fetch Grades (ID-only)
            const gradesQuery = query(
                collection(db, 'grades'),
                where('userId', '==', auth.currentUser.uid),
                where('classId', '==', selectedNilaiClass),
                where('subjectId', '==', selectedNilaiSubject),
                where('date', '>=', nilaiStartDate),
                where('date', '<=', nilaiEndDate)
            );
            const gradesSnap = await getDocs(gradesQuery);
            const rawGrades = gradesSnap.docs.map(doc => doc.data());

            const endOfDay = new Date(nilaiEndDate);
            endOfDay.setHours(23, 59, 59, 999);

            const infractionsQuery = query(
                collection(db, 'infractions'),
                where('userId', '==', auth.currentUser.uid),
                where('date', '>=', new Date(nilaiStartDate).toISOString()),
                where('date', '<=', endOfDay.toISOString())
            );

            const appreciationsQuery = query(
                collection(db, 'studentAppreciations'),
                where('userId', '==', auth.currentUser.uid),
                where('date', '>=', nilaiStartDate),
                where('date', '<=', nilaiEndDate)
            );

            const [infSnap, appSnap] = await Promise.all([
                getDocs(infractionsQuery),
                getDocs(appreciationsQuery)
            ]);

            const rawInfractions = infSnap.docs.map(doc => doc.data());
            const rawAppreciations = appSnap.docs.map(doc => doc.data());

            const recapitulation = {};
            fetchedStudents.forEach(student => {
                recapitulation[student.id] = {
                    absen: student.absen,
                    nis: student.nis,
                    name: student.name,
                    NH: [],
                    Formatif: [],
                    Sumatif: [],
                    Ulangan: [],
                    PTS: [],
                    PAS: [],
                    Praktik: [],
                    totalPointsDeducted: 0,
                    totalStars: 0,
                };
            });

            rawGrades.forEach(grade => {
                if (recapitulation[grade.studentId]) {
                    const score = parseFloat(grade.score);
                    if (!isNaN(score)) {
                        const type = grade.assessmentType;
                        if (['Harian', 'Tugas', 'Kuis', 'Pengetahuan', 'Homework'].includes(type)) recapitulation[grade.studentId].NH.push(score);
                        else if (type === 'Formatif') recapitulation[grade.studentId].Formatif.push(score);
                        else if (type === 'Sumatif') recapitulation[grade.studentId].Sumatif.push(score);
                        else if (type === 'Ulangan') recapitulation[grade.studentId].Ulangan.push(score);
                        else if (type === 'Tengah Semester' || type === 'PTS') recapitulation[grade.studentId].PTS.push(score);
                        else if (type === 'Akhir Semester' || type === 'PAS') recapitulation[grade.studentId].PAS.push(score);
                        else if (['Praktik', 'Proyek', 'Produk', 'Portofolio', 'Keterampilan', 'Unjuk Kerja', 'Praktikum', 'Project', 'Skill'].includes(type)) recapitulation[grade.studentId].Praktik.push(score);
                    }
                }
            });

            rawInfractions.forEach(inf => {
                if (recapitulation[inf.studentId]) {
                    recapitulation[inf.studentId].totalPointsDeducted += (inf.points || 0);
                }
            });

            rawAppreciations.forEach(app => {
                if (recapitulation[app.studentId]) {
                    recapitulation[app.studentId].totalStars += (app.points || 0);
                }
            });

            let knowledgeW = 0.4;
            let practiceW = 0.6;
            let academicWeight = globalAcademicWeight || 50;
            let attitudeWeight = globalAttitudeWeight || 50;

            try {
                const agreementRef = doc(db, 'class_agreements', `${auth.currentUser.uid}_${selectedNilaiClass}`);
                const agreementSnap = await getDoc(agreementRef);
                if (agreementSnap.exists()) {
                    const agreementData = agreementSnap.data();
                    knowledgeW = (agreementData.knowledgeWeight ?? 40) / 100;
                    practiceW = (agreementData.practiceWeight ?? 60) / 100;
                    academicWeight = agreementData.academicWeight ?? academicWeight;
                    attitudeWeight = agreementData.attitudeWeight ?? attitudeWeight;
                }
            } catch (err) {
                console.warn("Failed to fetch class agreement, using defaults:", err);
            }

            const finalNilaiData = Object.values(recapitulation).map(studentData => {
                const dailyScores = [
                    ...studentData.NH,
                    ...studentData.Formatif,
                    ...studentData.Sumatif,
                    ...studentData.Ulangan
                ];

                const dailyAvg = dailyScores.length > 0 ? dailyScores.reduce((a, b) => a + b, 0) / dailyScores.length : 0;
                const ptsAvg = studentData.PTS.length > 0 ? studentData.PTS.reduce((a, b) => a + b, 0) / studentData.PTS.length : 0;
                const pasAvg = studentData.PAS.length > 0 ? studentData.PAS.reduce((a, b) => a + b, 0) / studentData.PAS.length : 0;

                // Weighted Knowledge Calculation: (2*DailyAvg + PTS + PAS) / Divisor
                // Default N=2 (for Daily). Add 1 if PTS exists, Add 1 if PAS exists.
                let totalWeight = 0;
                let weightedSum = 0;

                if (dailyScores.length > 0) {
                    totalWeight += 2;
                    weightedSum += (dailyAvg * 2);
                }
                if (studentData.PTS.length > 0) {
                    totalWeight += 1;
                    weightedSum += ptsAvg;
                }
                if (studentData.PAS.length > 0) {
                    totalWeight += 1;
                    weightedSum += pasAvg;
                }

                const Pengetahuan_avg = totalWeight > 0 ? weightedSum / totalWeight : 0;
                const NH_avg = studentData.NH.length > 0 ? studentData.NH.reduce((a, b) => a + b, 0) / studentData.NH.length : 0;
                const Formatif_avg = studentData.Formatif.length > 0 ? studentData.Formatif.reduce((a, b) => a + b, 0) / studentData.Formatif.length : 0;
                const Sumatif_avg = studentData.Sumatif.length > 0 ? studentData.Sumatif.reduce((a, b) => a + b, 0) / studentData.Sumatif.length : 0;
                const Praktik_avg = studentData.Praktik.length > 0 ? studentData.Praktik.reduce((a, b) => a + b, 0) / studentData.Praktik.length : 0;

                let academicAvg = 0;
                if (Pengetahuan_avg > 0 && Praktik_avg > 0) academicAvg = (Pengetahuan_avg * knowledgeW) + (Praktik_avg * practiceW);
                else if (Pengetahuan_avg > 0) academicAvg = Pengetahuan_avg;
                else if (Praktik_avg > 0) academicAvg = Praktik_avg;

                const attitudeScore = 100 - studentData.totalPointsDeducted + (studentData.totalStars * 2);
                const finalAttitudeScore = Math.min(100, Math.max(0, attitudeScore));
                const NA = (academicAvg * academicWeight / 100) + (finalAttitudeScore * attitudeWeight / 100);

                return {
                    absen: studentData.absen,
                    nis: studentData.nis,
                    name: studentData.name,
                    NH_avg: NH_avg.toFixed(1),
                    Formatif_avg: Formatif_avg.toFixed(1),
                    Sumatif_avg: Sumatif_avg.toFixed(1),
                    PTS_avg: ptsAvg.toFixed(1),
                    PAS_avg: pasAvg.toFixed(1),
                    Praktik_avg: Praktik_avg.toFixed(1),
                    academicAvg: academicAvg.toFixed(1),
                    nilaiSikap: calculateNilaiSikap(finalAttitudeScore),
                    totalStars: studentData.totalStars,
                    totalPointsDeducted: studentData.totalPointsDeducted,
                    NA: NA.toFixed(1),
                    knowledgeW: (knowledgeW * 100).toFixed(0),
                    practiceW: (practiceW * 100).toFixed(0),
                    academicWeight,
                    attitudeWeight
                };
            }).sort((a, b) => a.absen - b.absen);
            setNilaiData(finalNilaiData);

        } catch (error) {
            console.error("Error fetching grades:", error);
            toast.error('Gagal mengambil data nilai.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePDFExport = () => {
        if (nilaiData.length === 0) {
            toast.error('Tidak ada data nilai untuk diekspor ke PDF.');
            return;
        }
        const classObj = classes.find(c => c.id === selectedNilaiClass);
        const subjectObj = subjects.find(s => s.id === selectedNilaiSubject);
        generateNilaiRecapPDF(nilaiData, schoolName, nilaiStartDate, nilaiEndDate, teacherName, classObj?.rombel || selectedNilaiClass, subjectObj?.name || selectedNilaiSubject, userProfile);
    };

    const handleExcelExport = () => {
        if (nilaiData.length === 0) {
            toast.error('Tidak ada data nilai untuk diekspor ke Excel.');
            return;
        }
        const classObj = classes.find(c => c.id === selectedNilaiClass);
        const subjectObj = subjects.find(s => s.id === selectedNilaiSubject);

        const exportData = nilaiData.map(item => ({
            'No. Absen': item.absen,
            'NIS': item.nis,
            'Nama Siswa': item.name,
            'Rata-rata NH': item.NH_avg,
            'Formatif': item.Formatif_avg,
            'Sumatif': item.Sumatif_avg,
            'PTS': item.PTS_avg,
            'PAS': item.PAS_avg,
            [`Praktik (${item.practiceW}%)`]: item.Praktik_avg,
            'Rata-rata Akademik': item.academicAvg,
            'Bintang Keaktifan (+)': item.totalStars,
            'Poin Pelanggaran (-)': item.totalPointsDeducted,
            'Nilai Sikap': item.nilaiSikap,
            'Nilai Akhir (NA)': item.NA,
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Nilai');
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(data, `Rekapitulasi_Nilai_${classObj?.rombel || selectedNilaiClass}_${subjectObj?.name || selectedNilaiSubject}_${nilaiStartDate}_${nilaiEndDate}.xlsx`);
    };

    const nilaiColumns = [
        { header: { label: 'No. Absen' }, accessor: 'absen' },
        { header: { label: 'NIS' }, accessor: 'nis' },
        { header: { label: 'Nama Siswa' }, accessor: 'name' },
        { header: { label: 'Rata NH' }, accessor: 'NH_avg' },
        { header: { label: 'Formatif' }, accessor: 'Formatif_avg' },
        { header: { label: 'Sumatif' }, accessor: 'Sumatif_avg' },
        { header: { label: 'PTS' }, accessor: 'PTS_avg' },
        { header: { label: 'PAS' }, accessor: 'PAS_avg' },
        {
            header: {
                label: nilaiData.length > 0 && nilaiData[0].practiceW
                    ? `Praktik (${nilaiData[0].practiceW}%)`
                    : 'Praktik'
            },
            accessor: 'Praktik_avg'
        },
        { header: { label: 'Akademik' }, accessor: 'academicAvg' },
        { header: { label: 'Bintang (+)' }, accessor: 'totalStars' },
        { header: { label: 'Pelanggaran (-)' }, accessor: 'totalPointsDeducted' },
        { header: { label: 'Sikap' }, accessor: 'nilaiSikap' },
        { header: { label: 'Nilai Akhir (NA)' }, accessor: 'NA' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mata Pelajaran</label>
                        <StyledSelect value={selectedNilaiSubject} onChange={(e) => setSelectedNilaiSubject(e.target.value)}>
                            <option value="">-- Pilih Mapel --</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </StyledSelect>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Kelas</label>
                        <StyledSelect value={selectedNilaiClass} onChange={(e) => setSelectedNilaiClass(e.target.value)}>
                            <option value="">-- Pilih Kelas --</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.rombel}</option>)}
                        </StyledSelect>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mulai</label>
                        <StyledInput type="date" value={nilaiStartDate} onChange={(e) => setNilaiStartDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Akhir</label>
                        <StyledInput type="date" value={nilaiEndDate} onChange={(e) => setNilaiEndDate(e.target.value)} />
                    </div>
                </div>
                <div className="mt-6 flex gap-2">
                    <StyledButton onClick={handleApplyFilter} className="flex-1">
                        Terapkan Filter
                    </StyledButton>
                    {nilaiData.length > 0 && (
                        <div className="flex gap-2">
                            <StyledButton onClick={handlePDFExport} className="bg-red-50 text-red-600 hover:bg-red-100">
                                <FileDown className="w-5 h-5" />
                            </StyledButton>
                            <StyledButton onClick={handleExcelExport} className="bg-green-50 text-green-600 hover:bg-green-100">
                                <FileDown className="w-5 h-5" />
                            </StyledButton>
                        </div>
                    )}
                </div>
                <div className="mt-4">
                    <QuickDateFilter onSelect={(start, end) => { setNilaiStartDate(start); setNilaiEndDate(end); }} />
                </div>
            </div>

            {isLoading ? (
                <div className="py-20"><LoadingSpinner label="Memproses data nilai..." /></div>
            ) : nilaiData.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryCard
                            title="Rata-rata Kelas"
                            value={Math.round(nilaiData.reduce((acc, curr) => acc + parseFloat(curr.NA), 0) / nilaiData.length)}
                            icon={<Award className="w-8 h-8 text-primary" />}
                            color="primary"
                        />
                        <SummaryCard
                            title="Nilai Tertinggi"
                            value={Math.max(...nilaiData.map(d => parseFloat(d.NA)))}
                            icon={<TrendingUp className="w-8 h-8 text-green-500" />}
                            color="green"
                        />
                        <SummaryCard
                            title="Nilai Terendah"
                            value={Math.min(...nilaiData.map(d => parseFloat(d.NA)))}
                            icon={<AlertTriangle className="w-8 h-8 text-red-500" />}
                            color="red"
                        />
                        <SummaryCard
                            title="Kelulusan"
                            value={`${Math.round((nilaiData.filter(d => parseFloat(d.NA) >= 75).length / nilaiData.length) * 100)}%`}
                            icon={<CheckCircle className="w-8 h-8 text-blue-500" />}
                            color="blue"
                        />
                    </div>

                    <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Rekapitulasi Nilai Peserta Didik</h3>
                            <div className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                                {subjects.find(s => s.id === selectedNilaiSubject)?.name || selectedNilaiSubject}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <StyledTable headers={nilaiColumns.map(c => c.header)}>
                                {nilaiData.map((row, index) => (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        {nilaiColumns.map(col => (
                                            <td key={col.accessor} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 border-b border-gray-50 dark:border-gray-800">
                                                {col.accessor === 'name' ? (
                                                    <div className="font-semibold text-gray-900 dark:text-white">{row[col.accessor]}</div>
                                                ) : col.accessor === 'NA' ? (
                                                    <span className={`font-bold ${parseFloat(row[col.accessor]) >= 75 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {row[col.accessor]}
                                                    </span>
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
                    title="Data nilai tidak tersedia"
                    description="Pilih mata pelajaran, kelas, and periode penilaian untuk melihat rekapitulasi."
                    icon={<Award className="w-16 h-16 text-gray-300" />}
                />
            )}
        </div>
    );
};

export default RekapGradeTab;
