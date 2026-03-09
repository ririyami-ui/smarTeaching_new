import React, { useState, useEffect } from 'react';
import {
    Save, FileText, Download, Workflow, Plus, Trash, Zap, Loader2, RefreshCw
} from 'lucide-react';
import moment from 'moment';
import 'moment/locale/id';
import { db, auth } from '../../firebase';
import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { exportToDocx } from '../../utils/teachingPlanUtils';
import { useSettings } from '../../utils/SettingsContext';
import { generateATP } from '../../utils/gemini';
import Modal from '../../components/Modal';

const ATPView = ({ grade, subject, semester, year, userProfile, signingLocation, sharedEfektifData, subjects, schedules }) => {
    const { geminiModel } = useSettings();
    const [atpItems, setAtpItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExporting, setIsExporting] = useState('');
    const [docId, setDocId] = useState(null);
    const [generationProgress, setGenerationProgress] = useState({ stage: '', message: '', percentage: 0 });

    const [manualTotalJP, setManualTotalJP] = useState(0);
    const [manualJpPerWeek, setManualJpPerWeek] = useState(0);
    const [manualTotalWeeks, setManualTotalWeeks] = useState(0);

    // Sync from Shared Data (Parent)
    useEffect(() => {
        if (sharedEfektifData) {
            if (sharedEfektifData.totalEffectiveHours > 0) setManualTotalJP(sharedEfektifData.totalEffectiveHours);
            if (sharedEfektifData.jpPerWeek > 0) setManualJpPerWeek(sharedEfektifData.jpPerWeek);
            if (sharedEfektifData.totalEffectiveWeeks > 0) setManualTotalWeeks(sharedEfektifData.totalEffectiveWeeks);
        }
    }, [sharedEfektifData]);

    useEffect(() => {
        let isAborted = false;
        const fetchData = async () => {
            if (!auth.currentUser) return;

            // Force high-priority sync from sharedEfektifData (Live calculated data)
            if (sharedEfektifData && sharedEfektifData.totalEffectiveHours > 0) {
                setManualTotalJP(sharedEfektifData.totalEffectiveHours);
                setManualJpPerWeek(sharedEfektifData.jpPerWeek);
                setManualTotalWeeks(sharedEfektifData.totalEffectiveWeeks);
            }

            setLoading(true);
            try {
                const id = `${auth.currentUser.uid}_${subject}_${grade}_${year.replace('/', '-')}_${semester}_ATP`;
                setDocId(id);
                const atpSnap = await getDoc(doc(db, 'teachingPrograms', id));
                if (isAborted) return;

                if (atpSnap.exists() && atpSnap.data().atpItems) {
                    setAtpItems(atpSnap.data().atpItems);
                } else {
                    setAtpItems([]);
                }

                // If shared data is missing OR incomplete, only then fallback to DB for JP
                if (!sharedEfektifData || !sharedEfektifData.totalEffectiveHours) {
                    const idProgram = `${auth.currentUser.uid}_${subject}_${grade}_${year.replace('/', '-')}_${semester}`;
                    const progSnap = await getDoc(doc(db, 'teachingPrograms', idProgram));
                    if (isAborted) return;
                    if (progSnap.exists()) {
                        const data = progSnap.data();
                        setManualTotalJP(data.totalEffectiveHours || 0);
                        setManualJpPerWeek(data.jpPerWeek || 0);
                        setManualTotalWeeks(data.totalEffectiveWeeks || 0);
                    }
                }
            } catch (error) {
                console.error("Error loading ATP:", error);
            } finally {
                if (!isAborted) setLoading(false);
            }
        };
        fetchData();
        return () => { isAborted = true; };
    }, [grade, subject, semester, year, sharedEfektifData]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGenerationProgress({ stage: 'init', message: 'Memulai koneksi ke sistem pakar...', percentage: 5 });
        try {
            // 1. Fetch Existing RPPs for Context
            const rppQuery = query(
                collection(db, 'lessonPlans'),
                where('userId', '==', auth.currentUser.uid),
                where('gradeLevel', '==', grade),
                where('subject', '==', subject)
            );
            const rppSnap = await getDocs(rppQuery);
            const existingRPPs = rppSnap.docs.map(doc => doc.data().topic || doc.data().materi).filter(Boolean);

            const result = await generateATP({
                subject,
                gradeLevel: grade,
                semester,
                totalJP: manualTotalJP,
                jpPerWeek: manualJpPerWeek,
                totalWeeks: manualTotalWeeks,
                modelName: geminiModel,
                existingRPPs: existingRPPs,
                userProfile: userProfile,
                // Note: onProgress is not supported by backend yet, but passed just in case
                onProgress: (msg) => setGenerationProgress(prev => ({ ...prev, message: msg }))
            }, geminiModel); // Pass modelName as 2nd arg to match service signature

            if (Array.isArray(result)) {
                setAtpItems(result.map(item => ({ ...item, id: Date.now() + Math.random() })));
                toast.success("ATP berhasil digenerate!");
            } else {
                toast.error("Gagal format respons dari AI.");
            }

        } catch (error) {
            console.error("Generate ATP Error:", error);
            toast.error("Gagal membuat ATP: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!docId) return;
        setLoading(true);
        try {
            const totalJP = atpItems.reduce((acc, cur) => acc + parseInt(cur.jp || 0), 0);
            await setDoc(doc(db, 'teachingPrograms', docId), {
                userId: auth.currentUser.uid,
                atpItems,
                subject,
                gradeLevel: grade,
                academicYear: year,
                semester,
                totalJP,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            toast.success("ATP berhasil disimpan!");
        } catch (error) {
            console.error("Error saving ATP:", error);
            toast.error("Gagal menyimpan ATP.");
        } finally {
            setLoading(false);
        }
    };

    const updateItem = (index, field, value) => {
        const newItems = [...atpItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setAtpItems(newItems);
    };

    const deleteItem = (index) => {
        if (!window.confirm("Hapus baris ini?")) return;
        const newItems = atpItems.filter((_, i) => i !== index);
        setAtpItems(newItems);
    };

    const addItem = () => {
        setAtpItems([...atpItems, { id: Date.now(), elemen: '', materi: '', tp: '', jp: 0, profilLulusan: '' }]);
    };

    const handleExportWordATP = async () => {
        setIsExporting('word');
        try {
            const S = {
                border: 'border: 1px solid black;', cell: 'border: 1px solid black; padding: 4px;',
                header: 'text-align: center; border: 1px solid black; background-color: #f2f2f2;',
                center: 'text-align: center;', bold: 'font-weight: bold;',
                full: 'width: 100%; border-collapse: collapse;'
            };

            const rows = atpItems.map((item, i) => `
            <tr>
                <td style="${S.cell} ${S.center}">${i + 1}</td>
                <td style="${S.cell}">${item.elemen || ''}</td>
                <td style="${S.cell}">${item.tp || item.kd || ''}</td>
                <td style="${S.cell}">${item.materi || ''}</td>
                <td style="${S.cell} ${S.center}">${item.jp || 0}</td>
                <td style="${S.cell} ${S.center}">${item.profilLulusan || '-'}</td>
            </tr>
        `).join('');

            const html = `
            <h2 style="text-align:center;">ALUR TUJUAN PEMBELAJARAN (ATP)</h2>
            <p>Satuan Pendidikan: ${userProfile?.school || '-'}<br/>Mata Pelajaran: ${subject}<br/>Kelas/Semester: ${grade}/${semester}<br/>Tahun Ajaran: ${year}</p>
            <table style="${S.full}">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="${S.header} width: 5%;">No</th>
                        <th style="${S.header} width: 20%;">Elemen</th>
                        <th style="${S.header} width: 30%;">Tujuan Pembelajaran (TP)</th>
                        <th style="${S.header} width: 25%;">Lingkup Materi</th>
                        <th style="${S.header} width: 10%;">Alokasi Waktu (JP)</th>
                        <th style="${S.header} width: 10%;">Profil Lulusan</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            
           <table border="0" style="${S.full} margin-top:40px; border:none;">
                <tr>
                    <td align="center" style="border:none; width:50%;">Mengetahui,<br/>Kepala Sekolah<br/><br/><br/><br/><br/><strong><u>${userProfile?.principalName || '...'}</u></strong><br/>NIP. ${userProfile?.principalNip || '...'}</td>
                    <td align="center" style="border:none; width:50%;">${signingLocation || '-'}, ${moment().format('DD MMMM YYYY')}<br/>Guru Mata Pelajaran<br/><br/><br/><br/><br/><strong><u>${userProfile?.name || '...'}</u></strong><br/>NIP. ${userProfile?.nip || '...'}</td>
                </tr>
            </table>
        `;
            exportToDocx(html, `ATP-${subject}-${grade}.docx`);
        } finally { setIsExporting(''); }
    };

    const handleExportPDFATP = async () => {
        setIsExporting('pdf');
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');
            const doc = new jsPDF('p', 'mm', 'a4');

            doc.setFontSize(14).setFont('helvetica', 'bold');
            doc.text('ALUR TUJUAN PEMBELAJARAN (ATP)', 105, 15, { align: 'center' });
            doc.setFontSize(10).setFont('helvetica', 'normal');
            doc.text(`Satuan Pendidikan: ${userProfile?.school || '-'}`, 14, 25);
            doc.text(`Mata Pelajaran: ${subject}`, 14, 30);
            doc.text(`Kelas / Semester: ${grade} / ${semester}`, 105, 25, { align: 'center' });
            doc.text(`Tahun Ajaran: ${year}`, 105, 30, { align: 'center' });

            const body = atpItems.map((item, i) => [
                i + 1, item.elemen, item.tp || item.kd, item.materi, item.jp, item.profilLulusan || '-'
            ]);

            autoTable(doc, {
                startY: 40,
                head: [['No', 'Elemen', 'Tujuan Pembelajaran', 'Materi', 'JP', 'Profil Lulusan']],
                body,
                theme: 'grid',
                headStyles: { fillColor: [124, 58, 237], halign: 'center' }, // Purple
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: { 0: { cellWidth: 8 }, 4: { halign: 'center' } }
            });

            const finalY = doc.lastAutoTable.finalY + 20;
            doc.text('Mengetahui,', 40, finalY, { align: 'center' });
            doc.text('Kepala Sekolah', 40, finalY + 5, { align: 'center' });
            doc.text(userProfile?.principalName || '...', 40, finalY + 25, { align: 'center' });
            doc.text(`NIP. ${userProfile?.principalNip || '...'}`, 40, finalY + 30, { align: 'center' });

            doc.text(`${signingLocation || '-'}, ${moment().format('DD MMMM YYYY')}`, 170, finalY, { align: 'center' });
            doc.text('Guru Mata Pelajaran', 170, finalY + 5, { align: 'center' });
            doc.text(userProfile?.name || '...', 170, finalY + 25, { align: 'center' });
            doc.text(`NIP. ${userProfile?.nip || '...'}`, 170, finalY + 30, { align: 'center' });

            doc.save(`ATP-${subject}-${grade}.pdf`);
            toast.success("PDF ATP berhasil diunduh!");
        } catch (e) {
            console.error(e);
            toast.error("Gagal export PDF.");
        } finally { setIsExporting(''); }
    };

    return (
        <div className="space-y-6">
            <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-800 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <Workflow className="text-purple-600" size={24} />
                    <div>
                        <h3 className="text-sm font-bold text-purple-900 dark:text-purple-100">Alur Tujuan Pembelajaran</h3>
                        <p className="text-xs text-purple-600 dark:text-purple-400">Total JP: {manualTotalJP} (Efektif: {manualTotalWeeks} pekan)</p>
                    </div>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg hover:shadow-lg transition disabled:opacity-70 text-sm font-bold ${isGenerating
                        ? 'bg-purple-100 text-purple-700 border border-purple-200 cursor-wait'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                        }`}
                >
                    {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                    {isGenerating
                        ? (generationProgress.message || 'Sedang Menyusun...')
                        : 'Generate ATP Otomatis'}
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 uppercase font-bold text-xs sticky top-0">
                            <tr>
                                <th className="px-4 py-3 w-12 text-center">No</th>
                                <th className="px-4 py-3 w-1/5">Elemen (CP)</th>
                                <th className="px-4 py-3 w-1/4">Tujuan Pembelajaran</th>
                                <th className="px-4 py-3">Lingkup Materi</th>
                                <th className="px-4 py-3 w-20 text-center">JP</th>
                                <th className="px-4 py-3 w-1/5">Profil Lulusan</th>
                                <th className="px-4 py-3 w-12 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {atpItems.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-gray-400 italic">
                                        Data kosong. Klik "Generate ATP Otomatis" atau tambah manual.
                                    </td>
                                </tr>
                            ) : (
                                atpItems.map((item, index) => (
                                    <tr key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="text-center py-2">{index + 1}</td>
                                        <td className="p-2 align-top">
                                            <textarea
                                                className="w-full bg-transparent border-none focus:ring-0 resize-none text-xs"
                                                rows="3"
                                                value={item.elemen}
                                                onChange={(e) => updateItem(index, 'elemen', e.target.value)}
                                                placeholder="Elemen..."
                                            />
                                        </td>
                                        <td className="p-2 align-top">
                                            <textarea
                                                className="w-full bg-transparent border-none focus:ring-0 resize-none font-medium text-xs"
                                                rows="3"
                                                value={item.tp || item.kd}
                                                onChange={(e) => updateItem(index, 'tp', e.target.value)}
                                                placeholder="Tujuan Pembelajaran..."
                                            />
                                        </td>
                                        <td className="p-2 align-top">
                                            <textarea
                                                className="w-full bg-transparent border-none focus:ring-0 resize-none text-xs"
                                                rows="3"
                                                value={item.materi}
                                                onChange={(e) => updateItem(index, 'materi', e.target.value)}
                                                placeholder="Materi..."
                                            />
                                        </td>
                                        <td className="p-2 align-top text-center">
                                            <input
                                                type="number"
                                                className="w-12 text-center bg-gray-50 dark:bg-gray-900 border border-gray-200 rounded p-1"
                                                value={item.jp}
                                                onChange={(e) => updateItem(index, 'jp', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-2 align-top">
                                            <textarea
                                                className="w-full bg-transparent border-none focus:ring-0 resize-none text-xs"
                                                rows="3"
                                                value={item.profilLulusan || ''}
                                                onChange={(e) => updateItem(index, 'profilLulusan', e.target.value)}
                                                placeholder="Profil Lulusan..."
                                            />
                                        </td>
                                        <td className="p-2 text-center align-top">
                                            <button onClick={() => deleteItem(index)} className="text-red-500 hover:text-red-700 p-1">
                                                <Trash size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                    <button onClick={addItem} className="flex items-center gap-1 text-purple-600 hover:text-purple-800 text-xs font-bold">
                        <Plus size={14} /> Tambah Baris
                    </button>
                    <div className="text-xs font-bold text-gray-500">
                        Total JP: {atpItems.reduce((acc, cur) => acc + parseInt(cur.jp || 0), 0)}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-4 border-t dark:border-gray-700">
                <button onClick={handleExportPDFATP} disabled={atpItems.length === 0 || isExporting !== ''} className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-semibold disabled:opacity-50">
                    {isExporting === 'pdf' ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />} PDF
                </button>
                <button onClick={handleExportWordATP} disabled={atpItems.length === 0 || isExporting !== ''} className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-semibold disabled:opacity-50">
                    {isExporting === 'word' ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />} Word
                </button>
                <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition font-bold shadow disabled:opacity-50">
                    <Save size={16} /> {loading ? 'Menyimpan...' : 'Simpan ATP'}
                </button>
            </div>
        </div>
    );
};

export default ATPView;
