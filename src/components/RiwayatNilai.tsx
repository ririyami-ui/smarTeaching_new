import React, { useState } from 'react';
import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import moment from 'moment';
import { Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

import StyledInput from './StyledInput';
import StyledSelect from './StyledSelect';
import StyledButton from './StyledButton';
import StyledTable from './StyledTable';
import GradeDetailsModal from './GradeDetailsModal';
import { useSettings } from '../utils/SettingsContext';

interface Class {
  id: string;
  rombel: string;
}

interface Subject {
  id: string;
  name: string;
}

interface RiwayatNilaiProps {
  classes: Class[];
  subjects: Subject[];
}

interface GradeSessionData {
  date: string;
  assessmentType: string;
  material: string;
  grades: Record<string, unknown>[];
}

interface GradeSession {
  date: string;
  assessmentType: string;
  material: string;
  status: string;
  details: string;
}

const RiwayatNilai: React.FC<RiwayatNilaiProps> = ({ classes, subjects }) => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [riwayatData, setRiwayatData] = useState<GradeSession[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<GradeSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { activeSemester, academicYear } = useSettings();

  // Set default dates on mount — cover the full active semester
  React.useEffect(() => {
    if (!activeSemester || !academicYear) {
      // Fallback: start of current month to today
      setStartDate(moment().startOf('month').format('YYYY-MM-DD'));
      setEndDate(moment().format('YYYY-MM-DD'));
      return;
    }

    // Parse academic year (e.g. "2024/2025") → base year
    const baseYear = parseInt(academicYear.split('/')[0]) || moment().year();

    // Semester 1 = July–December of baseYear
    // Semester 2 = January–June of baseYear+1
    const sem = String(activeSemester).trim();
    if (sem === '1' || sem.toLowerCase().includes('1')) {
      setStartDate(`${baseYear}-07-01`);
      setEndDate(`${baseYear}-12-31`);
    } else {
      setStartDate(`${baseYear + 1}-01-01`);
      setEndDate(`${baseYear + 1}-06-30`);
    }
  }, [activeSemester, academicYear]);

  const handleShowHistory = async () => {
    if (!startDate || !endDate || !selectedClass || !selectedSubject) {
      toast.error('Silakan pilih rentang tanggal, kelas, dan mata pelajaran.');
      return;
    }
    if (!user) return;
    setIsFetching(true);
    setHasSearched(true);
    try {
      const studentsQuery = query(
        collection(db, 'students'),
        where('userId', '==', user.uid),
        where('classId', '==', selectedClass)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const allStudentsInClass = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Resolve selected subject name for client-side fallback matching
      const selectedSubjectObj = subjects.find(s => s.id === selectedSubject);
      const selectedSubjectName = selectedSubjectObj?.name || '';

      // Query WITHOUT subjectId filter so we also catch grades saved with old/different subject IDs
      const gradesQuery = query(
        collection(db, 'grades'),
        where('userId', '==', user.uid),
        where('classId', '==', selectedClass),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear)
      );
      const modernSnapshot = await getDocs(gradesQuery);
      const allDocs = modernSnapshot.docs;

      // Client-side: match by subjectId OR subjectName to handle legacy/recreated subjects
      const submittedGrades = allDocs
        .map(doc => doc.data())
        .filter(grade =>
          grade.subjectId === selectedSubject ||
          (selectedSubjectName && grade.subjectName === selectedSubjectName)
        );

      const gradesBySession = submittedGrades.reduce((acc: Record<string, GradeSessionData>, grade) => {
        const key = `${grade.date}-${grade.assessmentType}-${grade.material}`;
        if (!acc[key]) {
          acc[key] = {
            date: grade.date,
            assessmentType: grade.assessmentType,
            material: grade.material,
            grades: []
          };
        }
        acc[key].grades.push(grade);
        return acc;
      }, {} as Record<string, GradeSessionData>);

      const sessionList: GradeSession[] = Object.values(gradesBySession).map((session: GradeSessionData) => {
        let allGradesSubmitted = true;
        allStudentsInClass.forEach((student) => {
          const studentGrade = session.grades.find((grade: Record<string, unknown>) => grade.studentId === student.id);
          if (!studentGrade || parseFloat(String(studentGrade.score)) === 0) {
            allGradesSubmitted = false;
          }
        });

        const status = allGradesSubmitted ? 'Semua nilai terinput' : 'Sebagian nilai kosong';

        return {
          date: session.date,
          assessmentType: session.assessmentType,
          material: session.material,
          status,
          details: `${session.assessmentType} - ${session.material}`
        };
      });

      setRiwayatData(sessionList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error("Error fetching grade history: ", error);
      toast.error("Gagal memuat riwayat nilai.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleShowDetails = (item: GradeSession) => {
    setSelectedDate(item.date);
    setSelectedAssessmentType(item.assessmentType);
    setSelectedMaterial(item.material);
    setShowDetailsModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !user) return;

    try {
      setIsDeleting(true);
      const q = query(
        collection(db, 'grades'),
        where('userId', '==', user.uid),
        where('classId', '==', selectedClass),
        where('subjectId', '==', selectedSubject),
        where('date', '==', itemToDelete.date),
        where('assessmentType', '==', itemToDelete.assessmentType),
        where('material', '==', itemToDelete.material),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        toast.error("Data tidak ditemukan atau sudah terhapus.");
        handleShowHistory();
        setShowDeleteModal(false);
        return;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      toast.success("Data nilai berhasil dihapus.");
      handleShowHistory(); // Refresh list
    } catch (error) {
      console.error("Error deleting assessment:", error);
      toast.error("Gagal menghapus data.");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteClick = (item: GradeSession) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const riwayatNilaiColumns = [
    { label: 'Tanggal' },
    { label: 'Status' },
    { label: 'Keterangan' },
    { label: 'Aksi' },
  ];

  const handleQuickFilter = (range: string) => {
    let start, end;
    const today = moment();

    switch (range) {
      case 'today':
        start = today.format('YYYY-MM-DD');
        end = today.format('YYYY-MM-DD');
        break;
      case 'week':
        start = today.clone().startOf('week').format('YYYY-MM-DD');
        end = today.clone().endOf('week').format('YYYY-MM-DD');
        break;
      case 'month':
        start = today.clone().startOf('month').format('YYYY-MM-DD');
        end = today.clone().endOf('month').format('YYYY-MM-DD');
        break;
      case 'semester': {
        const currentMonth = today.month();
        if (currentMonth >= 6) { // July onwards (Sem 1)
          start = today.clone().month(6).startOf('month').format('YYYY-MM-DD');
          end = today.clone().month(11).endOf('month').format('YYYY-MM-DD');
        } else { // Jan - June (Sem 2)
          start = today.clone().month(0).startOf('month').format('YYYY-MM-DD');
          end = today.clone().month(5).endOf('month').format('YYYY-MM-DD');
        }
        break;
      }
      default:
        return;
    }
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2 mb-4">
          <StyledButton onClick={() => handleQuickFilter('today')} variant="outline" size="sm">Hari Ini</StyledButton>
          <StyledButton onClick={() => handleQuickFilter('week')} variant="outline" size="sm">Minggu Ini</StyledButton>
          <StyledButton onClick={() => handleQuickFilter('month')} variant="outline" size="sm">Bulan Ini</StyledButton>
          <StyledButton onClick={() => handleQuickFilter('semester')} variant="outline" size="sm">Semester Ini</StyledButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
          <StyledInput type="date" label="Tanggal Mulai" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <StyledInput type="date" label="Tanggal Akhir" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <StyledSelect label="Kelas" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="">Pilih Kelas</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.rombel}</option>)}
          </StyledSelect>
          <StyledSelect label="Mata Pelajaran" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
            <option value="">Pilih Mata Pelajaran</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </StyledSelect>
          <div className="flex items-end">
            <StyledButton onClick={handleShowHistory} disabled={isFetching} className="w-full">
              {isFetching ? 'Mencari...' : 'Tampilkan Riwayat'}
            </StyledButton>
          </div>
        </div>

        {isFetching ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Mencari data riwayat...</p>
          </div>
        ) : riwayatData.length > 0 ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="overflow-x-auto mt-4 rounded-xl border border-gray-100 dark:border-gray-800">
              <StyledTable headers={riwayatNilaiColumns}>
                {riwayatData.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50/50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-700/50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{moment(row.date).format('DD MMMM YYYY')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2.5 py-0.5 inline-flex text-[10px] uppercase tracking-wider font-bold rounded-full ${row.status.includes('Semua') ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-800 dark:text-gray-200">{row.details}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      <div className="flex items-center gap-2">
                        <StyledButton onClick={() => handleShowDetails(row)} size="sm" variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50">Detail</StyledButton>
                        <StyledButton onClick={() => handleDeleteClick(row)} variant="danger" size="sm" className="bg-red-50 text-red-600 hover:bg-red-100 border-red-100">
                          <Trash2 size={16} />
                        </StyledButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </StyledTable>
            </div>
          </div>
        ) : hasSearched && (
          <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 animate-in fade-in duration-500">
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
              <AlertTriangle size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Data Tidak Ditemukan</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs text-center">
              Tidak ada data nilai untuk kriteria dan rentang tanggal yang dipilih.
            </p>
          </div>
        )}
      </div>


      {showDetailsModal && (
        <GradeDetailsModal
          date={selectedDate}
          assessmentType={selectedAssessmentType}
          material={selectedMaterial}
          selectedClass={selectedClass}
          selectedSubject={selectedSubject}
          onClose={() => setShowDetailsModal(false)}
          classes={classes}
          subjects={subjects}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-up">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Hapus Data Nilai?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Anda akan menghapus nilai untuk materi <br />
                   <span className="font-bold text-gray-700 dark:text-gray-300">&quot;{itemToDelete?.material}&quot;</span>.
                </p>
                <p className="text-xs text-red-500 mt-2 font-medium">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-200 dark:shadow-none flex justify-center items-center gap-2"
                >
                  {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RiwayatNilai;
