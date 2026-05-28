import React, { useState, useEffect } from 'react';
import {
    Save, FileSpreadsheet, FileText, Printer, Plus, Zap, Lock, Unlock, Trash, Loader2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import moment from 'moment';
import 'moment/locale/id';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { exportToDocx } from '../../utils/teachingPlanUtils';
import SignatureSection from './SignatureSection';
import { formatDate } from '../../utils/dateUtils';

interface PekanEfektifItem {
  name: string;
  totalWeeks: number | string;
  nonEffectiveWeeks: number | string;
  keterangan: string;
  isAuto?: boolean;
}

interface UserProfileInfo {
  school?: string;
  principalName?: string;
  principalNip?: string;
  name?: string;
  nip?: string;
  [key: string]: unknown;
}

interface SubjectInfo {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface ProtaViewProps {
  grade: string;
  subject: string;
  semester: string;
  year: string;
  activeTab: string;
  userProfile: UserProfileInfo;
  signingLocation?: string;
  sharedEfektifData?: {
    pekanEfektif?: PekanEfektifItem[];
    jpPerWeek?: number;
    totalEffectiveHours?: number;
    totalEffectiveWeeks?: number;
  } | null;
  subjects: SubjectInfo[];
}

interface ProtaRow {
  id: number;
  elemen: string;
  materi: string;
  kd?: string;
  jp: number | string;
  profilLulusan?: string;
}

const ProtaView: React.FC<ProtaViewProps> = ({ grade, subject, semester, year, activeTab, userProfile, signingLocation, sharedEfektifData }) => {
    const { user } = useAuth();
    const [protaData, setProtaData] = useState<ProtaRow[]>([]);
    const [targetJP, setTargetJP] = useState(0);
    const [loading, setLoading] = useState(false);
    const [programId, setProgramId] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(true);
    const [isExporting, setIsExporting] = useState('');

    // Live Sync Target JP from Shared State
    useEffect(() => {
        if (sharedEfektifData && sharedEfektifData.totalEffectiveHours && sharedEfektifData.totalEffectiveHours > 0) {
            setTargetJP(sharedEfektifData.totalEffectiveHours);
        }
    }, [sharedEfektifData]);

    useEffect(() => {
        let ignore = false;
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const cId = `calendar_${user.uid}_${grade}_${year.replace('/', '-')}_${semester}`;
                const cIdOld = `calendar_${user.uid}_${year.replace('/', '-')}_${semester}`;
                const pId = `${user.uid}_${subject}_${grade}_${year.replace('/', '-')}_${semester}`;
                setProgramId(pId);

                const [calSnap, calSnapOld, progSnap] = await Promise.all([
                    getDoc(doc(db, 'teachingPrograms', cId)),
                    getDoc(doc(db, 'teachingPrograms', cIdOld)),
                    getDoc(doc(db, 'teachingPrograms', pId))
                ]);

                if (ignore) return;

                if (progSnap.exists()) {
                    const data = progSnap.data();
                    setProtaData(data.prota ? data.prota : [{ id: 1, elemen: '', materi: '', jp: 0 }]);

                    if (!sharedEfektifData || sharedEfektifData.totalEffectiveHours === 0) {
                        if (data.totalEffectiveHours) {
                            setTargetJP(Number(data.totalEffectiveHours));
                        } else {
                            let effectiveMonths: PekanEfektifItem[] = [];
                            if (calSnap.exists() && calSnap.data().pekanEfektif) effectiveMonths = calSnap.data().pekanEfektif;
                            else if (calSnapOld.exists() && calSnapOld.data().pekanEfektif) effectiveMonths = calSnapOld.data().pekanEfektif;

                            if (effectiveMonths.length > 0) {
                                const totalWeeks = effectiveMonths.reduce((acc, curr) => acc + (parseInt(String(curr.totalWeeks || 0)) - parseInt(String(curr.nonEffectiveWeeks || 0))), 0);
                                setTargetJP(totalWeeks * Number(data.jpPerWeek || 0));
                            } else setTargetJP(0);
                        }
                    }
                } else {
                    setProtaData([{ id: 1, elemen: '', materi: '', jp: 0 }]);
                    if (!sharedEfektifData) setTargetJP(0);
                }
            } catch (error) {
                console.error("Error fetching Prota:", error);
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        fetchData();
        return () => { ignore = true; };
    }, [grade, subject, semester, year, activeTab, sharedEfektifData, user]);

    const addRow = () => {
        const newId = protaData.length > 0 ? Math.max(...protaData.map(d => d.id)) + 1 : 1;
        setProtaData([...protaData, { id: newId, elemen: '', materi: '', jp: 0 }]);
    };

    const deleteRow = (id: number) => setProtaData(protaData.filter(d => d.id !== id));

    const updateRow = (id: number, field: keyof ProtaRow, value: string | number) => {
        setProtaData(protaData.map(d => d.id === id ? { ...d, [field]: value } : d));
    };

    const handleSyncFromATP = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const atpId = `${user.uid}_${subject}_${grade}_${year.replace('/', '-')}_${semester}_ATP`;
            const atpSnap = await getDoc(doc(db, 'teachingPrograms', atpId));
            if (atpSnap.exists() && atpSnap.data().atpItems) {
                const mappedProta = atpSnap.data().atpItems.map((item: Record<string, unknown>, index: number) => ({
                    id: index + 1,
                    elemen: item.elemen || '',
                    materi: item.materi || '',
                    kd: item.tp || '',
                    jp: parseInt(String(item.jp || 0)),
                    profilLulusan: item.profilLulusan || ''
                }));
                setProtaData(mappedProta);
                toast.success(`Berhasil sinkronisasi ${mappedProta.length} baris dari ATP!`);
            } else {
                toast.error("Data ATP tidak ditemukan.");
            }
        } catch {
            toast.error("Gagal sinkronisasi dari ATP.");
        } finally {
            setLoading(false);
        }
    };

    const totalJP = protaData.reduce((acc, curr) => acc + parseInt(String(curr.jp || 0)), 0);

    const handleSave = async () => {
        if (!user || !programId) return;
        if (Number(totalJP) !== Number(targetJP)) {
            toast.error(`Validasi Gagal: Total JP (${totalJP}) harus sama dengan Jam Efektif (${targetJP}).`);
            return;
        }
        setLoading(true);
        try {
            await setDoc(doc(db, 'teachingPrograms', programId), {
                userId: user.uid,
                subject, gradeLevel: grade, academicYear: year, semester,
                updatedAt: new Date().toISOString(),
                prota: protaData
            }, { merge: true });
            toast.success("Data Program Tahunan tersimpan!");
        } catch {
            toast.error("Gagal menyimpan data.");
        } finally {
            setLoading(false);
        }
    };

    const handleExportWord = async () => {
        setIsExporting('word');
        try {
            const rows = protaData.map((row, i) => `
            <tr>
                <td class="text-center">${i + 1}</td>
                <td>${row.elemen || '-'}</td>
                <td>${row.materi}</td>
                <td>${row.kd || '-'}</td>
                <td class="text-center">${row.jp}</td>
                <td>${row.profilLulusan || '-'}</td>
            </tr>
        `).join('');

            const html = `
            <h1>PROGRAM TAHUNAN (PROTA)</h1>
            <p>Satuan Pendidikan: ${userProfile?.school || '-'}<br/>
            Mata Pelajaran: ${subject}<br/>
            Kelas / Semester: ${grade} / ${semester}<br/>
            Tahun Ajaran: ${year}</p>
            <table>
                <thead><tr><th>No</th><th>Elemen</th><th>Lingkup Materi</th><th>Tujuan Pembelajaran</th><th>JP</th><th>Profil Lulusan</th></tr></thead>
                <tbody>
                    ${rows}
                    <tr style="font-weight:bold;background:#f0f0f0;">
                        <td colspan="4" class="text-center">TOTAL</td>
                        <td class="text-center">${totalJP}</td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
            <table class="signature-table">
                <tr>
                    <td>Mengetahui,<br/>Kepala Sekolah<br/><div class="signature-name">${userProfile?.principalName || '...'}</div><div>NIP. ${userProfile?.principalNip || '...'}</div></td>
                    <td>${signingLocation || '-'}, ${moment().format('DD MMMM YYYY')}<br/>Guru Mata Pelajaran<br/><div class="signature-name">${userProfile?.name || '...'}</div><div>NIP. ${userProfile?.nip || '...'}</div></td>
                </tr>
            </table>
        `;
            exportToDocx(html, `Prota-${subject}-${grade}.docx`);
        } finally {
            setIsExporting('');
        }
    };

    const handleExportExcel = async () => {
        setIsExporting('excel');
        try {
            const XLSX = await import("xlsx");
            const { saveAs } = await import("file-saver");
            const dateStr = formatDate(new Date());
            const data = [
                ['PROGRAM TAHUNAN (PROTA)'],
                [`Satuan Pendidikan: ${userProfile?.school || '-'}`],
                [`Mata Pelajaran: ${subject} | Kelas: ${grade} | Tahun Ajaran: ${year}`],
                [],
                ['No', 'Elemen', 'Lingkup Materi', 'Tujuan Pembelajaran', 'JP', 'Profil Lulusan'],
                ...protaData.map((r, i) => [i + 1, r.elemen, r.materi, r.kd, parseInt(String(r.jp || 0)), r.profilLulusan || '-']),
                ['TOTAL', '', '', '', totalJP, ''],
                [],
                ['Mengetahui,', '', '', `${signingLocation || '-'}, ${dateStr}`],
                ['Kepala Sekolah', '', '', 'Guru Mata Pelajaran'],
                [],
                [],
                [],
                [userProfile?.principalName || '.....................', '', '', userProfile?.name || '.....................'],
                [`NIP. ${userProfile?.principalNip || '-'}`, '', '', `NIP. ${userProfile?.nip || '-'}`]
            ];
            const ws = XLSX.utils.aoa_to_sheet(data);
            ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 25 }, { wch: 40 }, { wch: 10 }, { wch: 25 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Program Tahunan");
            saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]), `Prota-${subject}-${grade}.xlsx`);
            toast.success("Excel Prota berhasil diunduh!");
        } catch { toast.error("Gagal ekspor Excel."); }
        finally { setIsExporting(''); }
    };

    const handleExportPDF = async () => {
        setIsExporting('pdf');
        try {
            const { default: jsPDF } = await import("jspdf");
            const { default: autoTable } = await import("jspdf-autotable");
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setFontSize(14).text('PROGRAM TAHUNAN (PROTA)', 105, 15, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`Satuan Pendidikan: ${userProfile?.school || '-'}`, 14, 25);
            doc.text(`Mata Pelajaran: ${subject}`, 14, 30);
            doc.text(`Kelas: ${grade} | Tahun Ajaran: ${year}`, 14, 35);

            autoTable(doc, {
                startY: 42,
                head: [['No', 'Elemen', 'Lingkup Materi', 'Tujuan Pembelajaran', 'JP', 'Profil Lulusan']],
                body: [
                    ...protaData.map((r, i) => [i + 1, r.elemen, r.materi, r.kd || '', r.jp, r.profilLulusan || '-']),
                    [{ content: 'TOTAL', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } }, { content: totalJP, styles: { fontStyle: 'bold' } }, '']
                ],
                theme: 'grid',
                headStyles: { fillColor: [37, 99, 235] },
                styles: { fontSize: 8, cellPadding: 3 },
                columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 35 }, 2: { cellWidth: 35 }, 3: { cellWidth: 60 }, 4: { cellWidth: 15, halign: 'center' } }
            });

            const dateStr = formatDate(new Date());
            let sigY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
            if (sigY > pageHeight - 50) { doc.addPage(); sigY = 20; }

            const leftX = 40, rightX = pageWidth - 40;
            doc.setFontSize(10);
            doc.text('Mengetahui,', leftX, sigY, { align: 'center' });
            doc.text('Kepala Sekolah', leftX, sigY + 5, { align: 'center' });
            doc.setFont('helvetica', 'bold').text(userProfile?.principalName || '.....................', leftX, sigY + 25, { align: 'center' });
            doc.setFont('helvetica', 'normal').text(`NIP. ${userProfile?.principalNip || '-'}`, leftX, sigY + 30, { align: 'center' });

            doc.text(`${signingLocation || '-'}, ${dateStr}`, rightX, sigY, { align: 'center' });
            doc.text('Guru Mata Pelajaran', rightX, sigY + 5, { align: 'center' });
            doc.setFont('helvetica', 'bold').text(userProfile?.name || '.....................', rightX, sigY + 25, { align: 'center' });
            doc.setFont('helvetica', 'normal').text(`NIP. ${userProfile?.nip || '-'}`, rightX, sigY + 30, { align: 'center' });

            doc.save(`Prota-${subject}-${grade}.pdf`);
            toast.success("PDF Prota berhasil diunduh!");
        } catch (e) { console.error(e); toast.error("Gagal ekspor PDF."); }
        finally { setIsExporting(''); }
    };

    const isMatch = totalJP === targetJP;
    const isOver = totalJP > targetJP;

    return (
        <div className="space-y-6">
            <div className={`flex flex-col md:flex-row justify-between items-center gap-4 p-4 rounded-lg border ${targetJP === 0 ? 'bg-blue-50 border-blue-200' : isMatch ? 'bg-green-50 border-green-200' : isOver ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Total Alokasi Waktu</p>
                    <div className="flex items-baseline gap-2">
                        <p className={`text-2xl font-bold ${targetJP === 0 ? 'text-blue-600' : isMatch ? 'text-green-600' : isOver ? 'text-red-600' : 'text-yellow-600'}`}>{totalJP} JP</p>
                        {targetJP > 0 && <span className="text-sm text-gray-500">/ {targetJP} JP (Target)</span>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setIsLocked(!isLocked)} className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg transition-all shadow-sm ${isLocked ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'}`}>
                        {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                        {isLocked ? 'Buka Kunci' : 'Kunci Data'}
                    </button>
                    <button onClick={handleSyncFromATP} disabled={loading || isLocked} className={`flex items-center gap-2 px-3 py-2 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:shadow-md transition ${isLocked ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}>
                        <Zap size={16} />Sinkronkan dari ATP
                    </button>
                    <button onClick={addRow} disabled={isLocked} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <Plus size={16} />Tambah Baris
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-4 py-3 w-12">No</th>
                            <th className="px-4 py-3 w-1/4">Elemen</th>
                            <th className="px-4 py-3 w-1/4">Lingkup Materi</th>
                            <th className="px-4 py-3">Tujuan Pembelajaran</th>
                            <th className="px-4 py-3 w-28 text-center">Alokasi (JP)</th>
                            <th className="px-4 py-3 w-[15%]">Profil Lulusan</th>
                            <th className="px-4 py-3 w-20 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {protaData.map((row, index) => (
                            <tr key={row.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                <td className="px-4 py-3 text-center text-gray-400 font-medium">{index + 1}</td>
                                <td className="px-3 py-2 border-r dark:border-gray-700">
                                    <textarea rows={2} value={row.elemen || ''} placeholder={isLocked ? '' : 'elemen...'} readOnly={isLocked} onChange={(e) => updateRow(row.id, 'elemen', e.target.value)} className={`w-full p-2 text-sm border-none bg-transparent focus:ring-1 focus:ring-blue-500 rounded resize-none dark:text-white outline-none ${isLocked ? 'cursor-default' : ''}`} />
                                </td>
                                <td className="px-3 py-2 border-r dark:border-gray-700">
                                    <textarea rows={2} value={row.materi || ''} placeholder={isLocked ? '' : 'materi...'} readOnly={isLocked} onChange={(e) => updateRow(row.id, 'materi', e.target.value)} className={`w-full p-2 text-sm border-none bg-transparent focus:ring-1 focus:ring-blue-500 rounded resize-none dark:text-white outline-none ${isLocked ? 'cursor-default' : ''}`} />
                                </td>
                                <td className="px-3 py-2 border-r dark:border-gray-700">
                                    <textarea rows={2} value={row.kd || ''} placeholder={isLocked ? '' : 'kd...'} readOnly={isLocked} onChange={(e) => updateRow(row.id, 'kd', e.target.value)} className={`w-full p-2 text-sm border-none bg-transparent focus:ring-1 focus:ring-blue-500 rounded resize-none dark:text-white outline-none ${isLocked ? 'cursor-default' : ''}`} />
                                </td>
                                <td className="px-4 py-2">
                                    <input type="number" min="0" value={row.jp} readOnly={isLocked} onChange={(e) => updateRow(row.id, 'jp', e.target.value)} className={`w-full p-2 text-center font-bold text-blue-600 bg-blue-50/50 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${isLocked ? 'cursor-default' : ''}`} />
                                </td>
                                <td className="px-3 py-2 border-l dark:border-gray-700">
                                    <textarea rows={2} value={row.profilLulusan || ''} placeholder={isLocked ? '' : 'Dimensi Profil...'} readOnly={isLocked} onChange={(e) => updateRow(row.id, 'profilLulusan', e.target.value)} className={`w-full p-2 text-sm border-none bg-transparent focus:ring-1 focus:ring-blue-500 rounded resize-none dark:text-white outline-none ${isLocked ? 'cursor-default' : ''}`} />
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <button onClick={() => deleteRow(row.id)} disabled={isLocked} className={`p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition ${isLocked ? 'opacity-0 pointer-events-none' : ''}`}>
                                        <Trash size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {protaData.length === 0 && (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Belum ada data. Klik &quot;Tambah Baris&quot; untuk memulai.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <SignatureSection userProfile={userProfile} signingLocation={signingLocation} />

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center no-print pt-4 border-t dark:border-gray-700 gap-4">
                <div className="flex flex-wrap gap-2">
                    <button onClick={handleExportPDF} disabled={isExporting !== ''} className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition text-sm flex items-center justify-center gap-2">
                        {isExporting === 'pdf' ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />} PDF
                    </button>
                    <button onClick={handleExportWord} disabled={isExporting !== ''} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm flex items-center justify-center gap-2">
                        {isExporting === 'word' ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />} Word
                    </button>
                    <button onClick={handleExportExcel} disabled={isExporting !== ''} className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm flex items-center justify-center gap-2">
                        {isExporting === 'excel' ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />} Excel
                    </button>
                    <button onClick={() => window.print()} disabled={isExporting !== ''} className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition text-sm flex items-center justify-center gap-2">
                        <Printer size={16} /> Cetak
                    </button>
                </div>
                <button onClick={handleSave} disabled={loading} className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg transition">
                    <Save size={18} />{loading ? 'Menyimpan...' : 'Simpan Prota'}
                </button>
            </div>
        </div>
    );
};

export default ProtaView;
