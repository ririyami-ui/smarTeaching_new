import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, writeBatch, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import StyledButton from './StyledButton';
import StyledTable from './StyledTable';
import StyledInput from './StyledInput';
import { useSettings } from '../utils/SettingsContext';
import toast from 'react-hot-toast';
import moment from 'moment';

const GradeDetailsModal = ({ date, assessmentType, material, selectedClass, selectedSubject, onClose, classes, subjects }) => {
  const [studentGrades, setStudentGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gradeStatus, setGradeStatus] = useState('');
  const { activeSemester, academicYear } = useSettings();

  useEffect(() => {
    const fetchGradeDetails = async () => {
      setLoading(true);
      try {
        // 1. Fetch Students (Modern only)
        const studentsQ = query(
          collection(db, 'students'),
          where('userId', '==', auth.currentUser.uid),
          where('classId', '==', selectedClass)
        );
        const studentsSnap = await getDocs(studentsQ);
        const fetchedStudents = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Fetch Grades for this session (Modern only)
        const gradesQ = query(
          collection(db, 'grades'),
          where('userId', '==', auth.currentUser.uid),
          where('date', '==', date),
          where('classId', '==', selectedClass),
          where('subjectId', '==', selectedSubject),
          where('assessmentType', '==', assessmentType),
          where('material', '==', material),
          where('semester', '==', activeSemester),
          where('academicYear', '==', academicYear)
        );
        const gradesSnap = await getDocs(gradesQ);
        const gradesMap = new Map();
        gradesSnap.forEach(doc => {
          const data = doc.data();
          if (data.studentId) gradesMap.set(data.studentId, { score: data.score, id: doc.id });
        });

        const combinedData = fetchedStudents.map(student => {
          const gradeData = gradesMap.get(student.id);
          return {
            id: student.id,
            name: student.name,
            nis: student.nis,
            absen: student.absen,
            gradeId: gradeData ? gradeData.id : null,
            score: gradeData ? gradeData.score : '',
            originalScore: gradeData ? gradeData.score : '',
          };
        });

        // 4. Sort in memory (Prefer Absen, then Name)
        combinedData.sort((a, b) => {
          const aAbsen = parseInt(a.absen) || 999;
          const bAbsen = parseInt(b.absen) || 999;
          if (aAbsen !== bAbsen) return aAbsen - bAbsen;
          return a.name.localeCompare(b.name);
        });

        setStudentGrades(combinedData);

        // Determine grade status
        const filledCount = combinedData.filter(s => s.score !== '' && s.score !== null).length;
        if (filledCount === combinedData.length && combinedData.length > 0) {
          setGradeStatus('Nilai terinput semua');
        } else {
          setGradeStatus(`Terisi ${filledCount} dari ${combinedData.length} siswa`);
        }

      } catch (error) {
        console.error('Error fetching grade details:', error);
        toast.error("Gagal memuat detail nilai.");
      } finally {
        setLoading(false);
      }
    };

    if (date && selectedClass && selectedSubject && auth.currentUser) {
      fetchGradeDetails();
    }
  }, [date, assessmentType, material, selectedClass, selectedSubject, auth.currentUser, activeSemester, academicYear, classes, subjects]);

  const handleScoreChange = (studentId, newScore) => {
    setStudentGrades(prev => prev.map(s =>
      s.id === studentId ? { ...s, score: newScore } : s
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    const batch = writeBatch(db);

    try {
      // Identify changes
      const changes = studentGrades.filter(s => s.score !== s.originalScore);

      if (changes.length === 0) {
        toast('Tidak ada perubahan nilai untuk disimpan.', { icon: 'ℹ️' });
        setSaving(false);
        return;
      }

      changes.forEach(student => {
        if (student.gradeId) {
          // Update existing grade
          const gradeRef = doc(db, 'grades', student.gradeId);
          batch.update(gradeRef, { score: parseFloat(student.score) || 0 });
        } else {
          // Create new grade (if logic allows, but usually history implies existing)
          // For now, we only update existing history. Implementing create in history might be complex due to missing fields like subjectName/className which we'd need to fetch/pass.
          // However, if the user wants to "fill empty" spots in history, we should support it.
          // Let's support creation if needed, assuming we have enough context.
          const newGradeRef = doc(collection(db, 'grades'));
          batch.set(newGradeRef, {
            userId: auth.currentUser.uid,
            studentId: student.id,
            name: student.name,
            classId: selectedClass,
            className: classes.find(c => c.id === selectedClass)?.rombel || '', // Fallback
            subjectId: selectedSubject,
            subjectName: subjects.find(s => s.id === selectedSubject)?.name || '', // Fallback
            date: date,
            assessmentType: assessmentType,
            material: material,
            score: parseFloat(student.score) || 0,
            semester: activeSemester,
            academicYear: academicYear,
            timestamp: new Date()
          });
        }
      });

      await batch.commit();
      toast.success("Perubahan nilai berhasil disimpan!");
      onClose(); // Close modal on success

    } catch (error) {
      console.error("Error saving grades:", error);
      toast.error("Gagal menyimpan perubahan nilai.");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { header: { label: 'NIS' }, accessor: 'nis' },
    { header: { label: 'Nama Siswa' }, accessor: 'name' },
    { header: { label: 'Nilai' }, accessor: 'score' },
  ];

  if (!date || !selectedClass || !selectedSubject) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              📝 Edit Nilai
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {assessmentType} • {material} • {moment(date).format('DD MMMM YYYY')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm flex justify-between items-center border-b border-blue-100 dark:border-blue-900/30">
          <span className="font-medium">Status: {gradeStatus}</span>
          <span className="text-xs opacity-75">Kelas: {classes.find(c => c.id === selectedClass)?.rombel || selectedClass} • Total: {studentGrades.length} Siswa</span>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p>Memuat data nilai...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-0">
            <div className="min-w-full inline-block align-middle">
              <div>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                    <tr>
                      <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        NIS
                      </th>
                      <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Nama Siswa
                      </th>
                      <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Nilai
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {studentGrades.map((row, index) => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white w-24">
                          {row.nis}
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          <div className="flex flex-col">
                            <span className="font-medium whitespace-normal">{row.name}</span>
                            <span className="text-xs text-gray-400 sm:hidden">{row.nis}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 w-24 sm:w-32">
                          <StyledInput
                            type="number"
                            value={row.score}
                            onChange={(e) => handleScoreChange(row.id, e.target.value)}
                            className={`w-full text-center text-lg py-1.5 font-bold transition-all focus:ring-2 focus:ring-blue-500 !px-1 ${row.score !== row.originalScore ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10' : ''}`}
                            placeholder="-"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3 rounded-b-2xl">
          <StyledButton onClick={onClose} variant="secondary" disabled={saving}>
            Batal
          </StyledButton>
          <StyledButton onClick={handleSave} disabled={saving} className="min-w-[140px]">
            {saving ? (
              <>
                <span className="opacity-75 mr-2">Menyimpan...</span>
                <span className="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              </>
            ) : (
              'Simpan Perubahan'
            )}
          </StyledButton>
        </div>
      </div>
    </div>
  );
};

export default GradeDetailsModal;
