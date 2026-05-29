import React, { useState } from 'react';
import { BookOpen, Edit2, Save, X, Loader, Trash2 } from 'lucide-react';
import moment from 'moment';
import { Grade } from '../types/studentTypes';
import { doc, writeBatch, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

interface StudentAcademicDetailProps {
    filteredGrades: Grade[];
    selectedStudentId?: string;
    selectedClass?: string;
    activeSemester?: string;
    academicYear?: string;
    userId?: string;
    onGradesUpdated?: () => void;
}

const StudentAcademicDetail: React.FC<StudentAcademicDetailProps> = ({
    filteredGrades,
    selectedStudentId,
    selectedClass,
    activeSemester,
    academicYear,
    userId,
    onGradesUpdated
}) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedGrades, setEditedGrades] = useState<Record<number, string | number>>({});
    const [isSaving, setIsSaving] = useState(false);

    const handleEditClick = () => {
        const initialEdits: Record<number, string | number> = {};
        filteredGrades.forEach((g, i) => {
            initialEdits[i] = g.score;
        });
        setEditedGrades(initialEdits);
        setIsEditMode(true);
    };

    const handleCancel = () => {
        setIsEditMode(false);
        setEditedGrades({});
    };

    const handleScoreChange = (index: number, value: string) => {
        const numValue = value === '' ? '' : Math.min(100, Math.max(0, parseFloat(value) || 0));
        setEditedGrades(prev => ({
            ...prev,
            [index]: numValue
        }));
    };

    const [isCleaning, setIsCleaning] = useState(false);

    const handleCleanupDuplicates = async () => {
        if (!selectedStudentId || !selectedClass || !userId) {
            toast.error('Pilih siswa dulu');
            return;
        }
        if (!window.confirm('Hapus semua nilai duplikat untuk siswa ini?')) return;
        setIsCleaning(true);
        try {
            const q = query(
                collection(db, 'grades'),
                where('userId', '==', userId)
            );
            const snapshot = await getDocs(q);
            const studentGrades = snapshot.docs.filter(d => d.id.startsWith(`${selectedStudentId}-${selectedClass}-`));

            const groups: Record<string, typeof studentGrades> = {};
            studentGrades.forEach(docSnap => {
                const data = docSnap.data();
                const key = `${data.subjectId || ''}|${(data.material || '').toLowerCase().trim().replace(/\s+/g, ' ')}|${(data.assessmentType || '').toLowerCase().trim().replace(/\s+/g, ' ')}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(docSnap);
            });

            let deleted = 0;
            const batch = writeBatch(db);
            for (const group of Object.values(groups)) {
                if (group.length > 1) {
                    group.sort((a, b) => {
                        const tA = a.data().timestamp?.toMillis?.() || new Date(a.data().date || 0).getTime();
                        const tB = b.data().timestamp?.toMillis?.() || new Date(b.data().date || 0).getTime();
                        return tB - tA;
                    });
                    group.slice(1).forEach(docSnap => {
                        batch.delete(docSnap.ref);
                        deleted++;
                    });
                }
            }

            if (deleted === 0) {
                // try more aggressive: delete grades with today's date that shadow another grade
                const today = new Date().toISOString().split('T')[0];
                const countByKey: Record<string, number> = {};
                studentGrades.forEach(d => {
                    const data = d.data();
                    const key = `${data.subjectId || ''}|${(data.material || '').toLowerCase().trim().replace(/\s+/g, ' ')}|${(data.assessmentType || '').toLowerCase().trim().replace(/\s+/g, ' ')}`;
                    countByKey[key] = (countByKey[key] || 0) + 1;
                });
                const extras = studentGrades.filter(d => {
                    const data = d.data();
                    const docDate = data.date ? (data.date.includes('T') ? data.date.split('T')[0] : data.date) : '';
                    const key = `${data.subjectId || ''}|${(data.material || '').toLowerCase().trim().replace(/\s+/g, ' ')}|${(data.assessmentType || '').toLowerCase().trim().replace(/\s+/g, ' ')}`;
                    return countByKey[key] > 1 && docDate === today;
                });
                extras.forEach(d => {
                    batch.delete(d.ref);
                    deleted++;
                });

                if (deleted > 0) {
                    await batch.commit();
                    toast.success(`${deleted} duplikat (hari ini) dihapus`);
                    onGradesUpdated?.();
                } else {
                    toast.success('Tidak ada duplikat');
                }
            } else {
                await batch.commit();
                toast.success(`${deleted} duplikat dihapus`);
                onGradesUpdated?.();
            }
        } catch (error) {
            console.error('Error cleaning duplicates:', error);
            toast.error('Gagal hapus duplikat');
        } finally {
            setIsCleaning(false);
        }
    };

    const handleSaveGrades = async () => {
        if (!selectedStudentId || !selectedClass || !activeSemester || !academicYear || !userId) {
            toast.error('Data tidak lengkap untuk menyimpan nilai');
            return;
        }

        setIsSaving(true);
        try {
            // 1. Hapus duplikat yang ada di filteredGrades
            const dupBatch = writeBatch(db);
            const gradesByKey: Record<string, Grade[]> = {};
            filteredGrades.forEach(g => {
                const key = `${g.subjectId || ''}|${(g.material || '').toLowerCase().trim().replace(/\s+/g, ' ')}|${(g.assessmentType || '').toLowerCase().trim().replace(/\s+/g, ' ')}`;
                if (!gradesByKey[key]) gradesByKey[key] = [];
                gradesByKey[key].push(g);
            });
            let dupDeleted = 0;
            Object.values(gradesByKey).forEach(arr => {
                if (arr.length > 1) {
                    arr.sort((a, b) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const tA = (a as any).timestamp?.toMillis?.() || new Date(a.date).getTime();
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const tB = (b as any).timestamp?.toMillis?.() || new Date(b.date).getTime();
                        return tB - tA;
                    });
                    arr.slice(1).forEach(g => {
                        if (g.id) {
                            dupBatch.delete(doc(db, 'grades', g.id));
                            dupDeleted++;
                        }
                    });
                }
            });
            if (dupDeleted > 0) {
                await dupBatch.commit();
                toast.success(`${dupDeleted} duplikat dihapus`);
                onGradesUpdated?.();
                return; // reload data, user harus klik simpan lagi
            }

            // 2. Simpan perubahan nilai
            const batch = writeBatch(db);
            let hasChanges = false;
            Object.entries(editedGrades).forEach(([idxStr, newScore]) => {
                const index = parseInt(idxStr, 10);
                const baseGrade = filteredGrades[index];
                if (newScore !== undefined && newScore !== '' && baseGrade && Number(newScore) !== Number(baseGrade.score)) {
                    hasChanges = true;
                    const sanitizedMaterial = (baseGrade.material || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
                    const sanitizedAssessmentType = (baseGrade.assessmentType || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
                    const datePart = baseGrade.date 
                        ? (baseGrade.date.includes('T') ? baseGrade.date.split('T')[0] : baseGrade.date) 
                        : new Date().toISOString().split('T')[0];
                    const uniqueGradeId = `${selectedStudentId}-${selectedClass}-${baseGrade.subjectId || ''}-${datePart}-${sanitizedMaterial}-${sanitizedAssessmentType}`;
                    const gradeRef = baseGrade.id 
                        ? doc(db, 'grades', baseGrade.id) 
                        : doc(db, 'grades', uniqueGradeId);
                    const newGrade = {
                        ...baseGrade,
                        score: parseFloat(String(newScore)),
                        userId,
                        semester: activeSemester,
                        academicYear,
                        timestamp: new Date(),
                        date: baseGrade.date || new Date().toISOString(),
                    };
                    batch.set(gradeRef, newGrade, { merge: true });
                }
            });

            if (!hasChanges) {
                toast.success('Tidak ada perubahan nilai');
                setIsEditMode(false);
                return;
            }

            await batch.commit();
            toast.success('Nilai berhasil diperbarui!');
            setIsEditMode(false);
            setEditedGrades({});
            onGradesUpdated?.();
        } catch (error) {
            console.error('Error saving grades:', error);
            toast.error('Gagal menyimpan nilai');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="card-glass p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600">
                        <BookOpen size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Detail Akademik</h2>
                </div>
                <div className="flex gap-1">
                    {!isEditMode && selectedStudentId && (
                        <>
                            <button
                                onClick={handleCleanupDuplicates}
                                disabled={isCleaning}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-500"
                                title="Hapus duplikat nilai"
                            >
                                {isCleaning ? <Loader size={18} className="animate-spin" /> : <Trash2 size={18} />}
                            </button>
                            <button
                                onClick={handleEditClick}
                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-blue-600"
                                title="Edit nilai"
                            >
                                <Edit2 size={18} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white dark:bg-gray-800 text-xs font-bold text-gray-500 uppercase tracking-wider z-10">
                        <tr>
                            <th className="pb-4">Tanggal</th>
                            <th className="pb-4">Materi / Subjek</th>
                            <th className="pb-4 text-right">Nilai</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y dark:divide-gray-700">
                        {filteredGrades.length > 0 ? filteredGrades.map((g, i) => (
                            <tr key={i} className="group hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="py-3 text-gray-500">{moment(g.date).format('DD/MM/YYYY')}</td>
                                <td className="py-3">
                                    <p className="font-bold text-gray-800 dark:text-gray-200">{g.material}</p>
                                    <p className="text-[10px] text-gray-400 uppercase">{g.subjectName} | {g.assessmentType}</p>
                                </td>
                                <td className="py-3 text-right">
                                    {isEditMode ? (
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={editedGrades[i] ?? g.score}
                                            onChange={(e) => handleScoreChange(i, e.target.value)}
                                            className="w-16 px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-right font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <span className={`px-2.5 py-1 rounded-lg font-bold ${Number(g.score) >= 75 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-red-100 text-red-700 dark:bg-red-900/30'}`}>
                                            {g.score}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={3} className="py-10 text-center text-gray-400 italic">Belum ada data nilai</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isEditMode && (
                <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50"
                    >
                        <X size={16} />
                        Batal
                    </button>
                    <button
                        onClick={handleSaveGrades}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold"
                    >
                        {isSaving ? (
                            <>
                                <Loader size={16} className="animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Simpan Perubahan
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default StudentAcademicDetail;


