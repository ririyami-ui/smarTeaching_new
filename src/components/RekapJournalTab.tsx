import React, { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { BookOpen, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';

import StyledInput from './StyledInput';
import StyledSelect from './StyledSelect';
import StyledButton from './StyledButton';
import StyledTable from './StyledTable';
import EmptyState from './EmptyState';
import QuickDateFilter from './QuickDateFilter';
import LoadingSpinner from './LoadingSpinner';
import { generateJurnalRecapPDF } from '../utils/pdfGenerator';
import { UserProfile } from '../types';

interface ClassItem {
    id: string;
    rombel: string;
}

interface SubjectItem {
    id: string;
    name: string;
}

interface RekapJournalTabProps {
    classes: ClassItem[];
    subjects: SubjectItem[];
    teacherName: string;
    userProfile: UserProfile | null;
}

const RekapJournalTab: React.FC<RekapJournalTabProps> = ({
    classes,
    subjects,
    teacherName,
    userProfile
}) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // State
    const [jurnalStartDate, setJurnalStartDate] = useState('');
    const [jurnalEndDate, setJurnalEndDate] = useState('');
    const [selectedJurnalClass, setSelectedJurnalClass] = useState('');
    const [selectedJurnalSubject, setSelectedJurnalSubject] = useState('');
    interface JournalDoc {
        id: string;
        date: string;
        className?: string;
        subjectName?: string;
        material?: string;
        learningObjectives?: string;
        learningActivities?: string;
        reflection?: string;
        challenges?: string;
        followUp?: string;
        isImplemented?: boolean;
        classId?: string;
        subjectId?: string;
        userId?: string;
    }

    const [jurnalData, setJurnalData] = useState<JournalDoc[]>([]);
    const [jurnalSearchTerm, setJurnalSearchTerm] = useState('');

    const handleShowJurnal = async () => {
        if (!jurnalStartDate || !jurnalEndDate) {
            toast.error('Silakan pilih rentang tanggal.');
            return;
        }
        setIsLoading(true);
        try {
            const journalsQuery = query(
                collection(db, 'teachingJournals'),
                where('userId', '==', user?.uid || ''),
                where('date', '>=', jurnalStartDate),
                where('date', '<=', jurnalEndDate)
            );
            const querySnapshot = await getDocs(journalsQuery);
            const fetchedJournals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalDoc)).sort((a: JournalDoc, b: JournalDoc) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setJurnalData(fetchedJournals);
        } catch (error) {
            console.error("Error fetching journals:", error);
            toast.error('Gagal mengambil data jurnal.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePDFExport = () => {
        if (jurnalData.length === 0) {
            toast.error('Tidak ada data jurnal untuk diekspor ke PDF.');
            return;
        }
        generateJurnalRecapPDF(jurnalData, jurnalStartDate, jurnalEndDate, teacherName, userProfile);
    };

    const handleExcelExport = () => {
        if (jurnalData.length === 0) {
            toast.error('Tidak ada data jurnal untuk diekspor ke Excel.');
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(jurnalData.map(item => ({
            'Tanggal': item.date || '',
            'Kelas': item.className || '',
            'Mata Pelajaran': item.subjectName || '',
            'Materi': item.material || '',
            'Tujuan Pembelajaran': item.learningObjectives || '',
            'Kegiatan Pembelajaran': item.learningActivities || '',
            'Refleksi': item.reflection || '',
            'Keterlaksanaan': item.isImplemented !== false ? 'Terlaksana' : 'Tidak Terlaksana',
            'Tindak Lanjut': item.followUp || '',
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Jurnal');
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(data, `Rekapitulasi_Jurnal_${jurnalStartDate}_${jurnalEndDate}.xlsx`);
    };

    const jurnalColumns = [
        { header: { label: 'Tanggal' }, accessor: 'date' },
        { header: { label: 'Kelas' }, accessor: 'className' },
        { header: { label: 'Mata Pelajaran' }, accessor: 'subjectName' },
        { header: { label: 'Materi' }, accessor: 'material' },
        { header: { label: 'Tujuan Pembelajaran' }, accessor: 'learningObjectives' },
        { header: { label: 'Kegiatan Pembelajaran' }, accessor: 'learningActivities' },
        { header: { label: 'Refleksi' }, accessor: 'reflection' },
        { header: { label: 'Hambatan' }, accessor: 'challenges' },
        { header: { label: 'Tindak Lanjut' }, accessor: 'followUp' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rentang Tanggal</label>
                        <div className="grid grid-cols-2 gap-2">
                            <StyledInput type="date" value={jurnalStartDate} onChange={(e) => setJurnalStartDate(e.target.value)} className="w-full" />
                            <StyledInput type="date" value={jurnalEndDate} onChange={(e) => setJurnalEndDate(e.target.value)} className="w-full" />
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mata Pelajaran</label>
                        <StyledSelect value={selectedJurnalSubject} onChange={(e) => setSelectedJurnalSubject(e.target.value)} className="w-full">
                            <option value="">-- Semua Mapel --</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </StyledSelect>
                    </div>

                    <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Kelas</label>
                        <StyledSelect value={selectedJurnalClass} onChange={(e) => setSelectedJurnalClass(e.target.value)} className="w-full">
                            <option value="">-- Semua Kelas --</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.rombel}</option>)}
                        </StyledSelect>
                    </div>

                    <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Cari Materi</label>
                        <StyledInput placeholder="Kata kunci..." value={jurnalSearchTerm} onChange={(e) => setJurnalSearchTerm(e.target.value)} className="w-full" />
                    </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-between border-t border-gray-100 dark:border-gray-800 pt-4 items-center">
                    <div className="w-full sm:w-auto">
                        <QuickDateFilter onSelect={(start: string, end: string) => { setJurnalStartDate(start); setJurnalEndDate(end); }} />
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <StyledButton onClick={handleShowJurnal} className="px-6">
                            Tampilkan Data
                        </StyledButton>
                        {jurnalData.length > 0 && (
                            <>
                                <StyledButton onClick={handlePDFExport} className="bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 gap-2 px-3">
                                    <FileDown className="w-4 h-4" /> PDF
                                </StyledButton>
                                <StyledButton onClick={handleExcelExport} className="bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 border-green-100 dark:border-green-900/30 gap-2 px-3">
                                    <FileDown className="w-4 h-4" /> Excel
                                </StyledButton>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="py-20"><LoadingSpinner label="Memuat jurnal mengajar..." /></div>
            ) : jurnalData.length > 0 ? (
                <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Daftar Jurnal Mengajar</h3>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <StyledTable headers={jurnalColumns.map(c => c.header)}>
                            {jurnalData
                                .filter(item => {
                                    const searchTermMatch = !jurnalSearchTerm ||
                                        item.material?.toLowerCase().includes(jurnalSearchTerm.toLowerCase()) ||
                                        item.className?.toLowerCase().includes(jurnalSearchTerm.toLowerCase()) ||
                                        item.subjectName?.toLowerCase().includes(jurnalSearchTerm.toLowerCase());

                                    const classMatch = !selectedJurnalClass || item.classId === selectedJurnalClass;
                                    const subjectMatch = !selectedJurnalSubject || item.subjectId === selectedJurnalSubject;

                                    return searchTermMatch && classMatch && subjectMatch;
                                })
                                .map((row, index) => {
                                    const r = row as unknown as Record<string, unknown>;
                                    return (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        {jurnalColumns.map(col => (
                                            <td key={col.accessor} className="px-6 py-4 whitespace-normal text-sm text-gray-600 dark:text-gray-300 border-b border-gray-50 dark:border-gray-800 min-w-[200px]">
                                                {col.accessor === 'date' ? (
                                                    <div className="font-medium whitespace-nowrap">{String(r[col.accessor] ?? '')}</div>
                                                ) : col.accessor === 'isImplemented' ? (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold \${r.isImplemented !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {r.isImplemented !== false ? 'Terlaksana' : 'Tidak Terlaksana'}
                                                    </span>
                                                ) : (
                                                    String(r[col.accessor] ?? '-')
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                    );
                                })}
                        </StyledTable>
                    </div>
                </div>
            ) : (
                <EmptyState
                    title="Jurnal tidak ditemukan"
                    description="Pilih rentang tanggal untuk melihat catatan jurnal mengajar Anda."
                    icon={<BookOpen className="w-16 h-16 text-gray-300" />}
                />
            )}
        </div>
    );
};

export default RekapJournalTab;

