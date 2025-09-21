import React, { useState, useEffect } from 'react';
import { collection, getDocs, writeBatch, query, limit, where, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Trash2 } from 'lucide-react';
import StyledInput from './StyledInput';
import StyledSelect from './StyledSelect';
import StyledButton from './StyledButton';
import StyledTable from './StyledTable';

const DatabaseManager = () => {
  const [status, setStatus] = useState({}); // { collectionName: "Deleting..." }

  // State for granular grade deletion
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassForGradeDeletion, setSelectedClassForGradeDeletion] = useState('');
  const [selectedSubjectForGradeDeletion, setSelectedSubjectForGradeDeletion] = useState('');
  const [selectedStudentForGradeDeletion, setSelectedStudentForGradeDeletion] = useState('');
  const [gradesToDelete, setGradesToDelete] = useState([]);
  const [gradeDeletionStatus, setGradeDeletionStatus] = useState('');

  // List of collections to manage. Add/remove as needed.
  const collectionsToManage = [
    'students',
    'teachingSchedules',
    'subjects',
    'classes',
    'attendance',
    'teachingJournals',
    'grades',
  ];

  // Fetch classes, subjects, students for filters
  useEffect(() => {
    const fetchData = async () => {
      if (auth.currentUser) {
        // Fetch classes
        const classesQuery = query(collection(db, 'classes'), where('userId', '==', auth.currentUser.uid));
        const classesSnapshot = await getDocs(classesQuery);
        setClasses(classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.rombel.localeCompare(b.rombel)));

        // Fetch subjects
        const subjectsQuery = query(collection(db, 'subjects'), where('userId', '==', auth.currentUser.uid));
        const subjectsSnapshot = await getDocs(subjectsQuery);
        setSubjects(subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.name.localeCompare(b.name)));
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchStudentsByClass = async () => {
      if (selectedClassForGradeDeletion && auth.currentUser) {
        const studentsQuery = query(
          collection(db, 'students'),
          where('userId', '==', auth.currentUser.uid),
          where('rombel', '==', selectedClassForGradeDeletion)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        setStudents(studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        setStudents([]);
      }
    };
    fetchStudentsByClass();
  }, [selectedClassForGradeDeletion]);

  const handleDeleteCollection = async (collectionName) => {
    if (!window.confirm(`Are you sure you want to delete ALL your data from the '${collectionName}' collection? This action cannot be undone.`)) {
      return;
    }

    if (!auth.currentUser) {
      setStatus(prev => ({ ...prev, [collectionName]: 'Error: User not authenticated.' }));
      return;
    }

    setStatus(prev => ({ ...prev, [collectionName]: 'Deleting...' }));
    const collectionRef = collection(db, collectionName);
    let deletedCount = 0;
    const userId = auth.currentUser.uid;

    try {
      while (true) {
        const q = query(collectionRef, where('userId', '==', userId), limit(500));
        const snapshot = await getDocs(q);

        if (snapshot.size === 0) {
          break;
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        deletedCount += snapshot.size;
        setStatus(prev => ({ ...prev, [collectionName]: `Deleted ${deletedCount} documents...` }));

        if (snapshot.size < 500) {
          break;
        }
      }
      setStatus(prev => ({ ...prev, [collectionName]: `Successfully deleted ${deletedCount} documents from '${collectionName}'.` }));
    } catch (error) {
      console.error(`Error deleting documents from ${collectionName}:`, error);
      setStatus(prev => ({ ...prev, [collectionName]: `Error: ${error.message}` }));
    }
  };

  const handleFetchGrades = async () => {
    if (!auth.currentUser) {
      setGradeDeletionStatus('Error: User not authenticated.');
      return;
    }

    setGradeDeletionStatus('Fetching grades...');
    let gradesQuery = query(
      collection(db, 'grades'),
      where('userId', '==', auth.currentUser.uid)
    );

    if (selectedClassForGradeDeletion) {
      gradesQuery = query(gradesQuery, where('classId', '==', selectedClassForGradeDeletion));
    }
    if (selectedSubjectForGradeDeletion) {
      gradesQuery = query(gradesQuery, where('subjectId', '==', selectedSubjectForGradeDeletion));
    }
    if (selectedStudentForGradeDeletion) {
      gradesQuery = query(gradesQuery, where('studentId', '==', selectedStudentForGradeDeletion));
    }

    try {
      const querySnapshot = await getDocs(gradesQuery);
      const fetchedGrades = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGradesToDelete(fetchedGrades);
      setGradeDeletionStatus(`Found ${fetchedGrades.length} grades.`);
    } catch (error) {
      console.error('Error fetching grades:', error);
      setGradeDeletionStatus(`Error fetching grades: ${error.message}`);
    }
  };

  const handleDeleteGrade = async (gradeId) => {
    if (!window.confirm('Are you sure you want to delete this grade? This action cannot be undone.')) {
      return;
    }

    if (!auth.currentUser) {
      setGradeDeletionStatus('Error: User not authenticated.');
      return;
    }

    setGradeDeletionStatus('Deleting grade...');
    try {
      await deleteDoc(doc(db, 'grades', gradeId));
      setGradesToDelete(prevGrades => prevGrades.filter(grade => grade.id !== gradeId));
      setGradeDeletionStatus('Grade deleted successfully!');
    } catch (error) {
      console.error('Error deleting grade:', error);
      setGradeDeletionStatus(`Error deleting grade: ${error.message}`);
    }
  };

  const gradeColumns = [
    { header: { label: 'Kelas' }, accessor: 'classId' },
    { header: { label: 'Mata Pelajaran' }, accessor: 'subjectId' },
    { header: { label: 'Siswa' }, accessor: 'studentName' }, // Assuming you have studentName in grade doc
    { header: { label: 'Nilai' }, accessor: 'score' },
    { header: { label: 'Tipe' }, accessor: 'gradeType' },
    { header: { label: 'Tanggal' }, accessor: 'date' },
    { header: { label: 'Aksi' }, accessor: 'actions' },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">Kelola Database</h3>
      <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
        Gunakan fitur ini dengan hati-hati. Menghapus data bersifat permanen dan tidak dapat dibatalkan.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collectionsToManage.map((colName) => (
          <div key={colName} className="bg-surface-light dark:bg-surface-dark p-4 rounded-lg shadow-md flex flex-col">
            <p className="text-md font-medium text-text-light dark:text-text-dark mb-2">{colName}</p>
            <button
              onClick={() => handleDeleteCollection(colName)}
              className="mt-auto bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition duration-300 ease-in-out"
              disabled={status[colName] === 'Deleting...'}
            >
              <Trash2 size={18} className="mr-2" />
              {status[colName] === 'Deleting...' ? 'Menghapus...' : 'Hapus Semua Data'}
            </button>
            {status[colName] && status[colName] !== 'Deleting...' && (
              <p className="text-sm mt-2 text-center" style={{ color: status[colName].startsWith('Error') ? 'red' : 'green' }}>
                {status[colName]}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm">
        <h4 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Hapus Nilai Spesifik</h4>
        <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-4">
          Filter dan hapus nilai berdasarkan kelas, mata pelajaran, atau siswa.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <StyledSelect
            label="Pilih Kelas"
            value={selectedClassForGradeDeletion}
            onChange={(e) => setSelectedClassForGradeDeletion(e.target.value)}
          >
            <option value="">Semua Kelas</option>
            {classes.map(c => <option key={c.id} value={c.rombel}>{c.rombel}</option>)}
          </StyledSelect>
          <StyledSelect
            label="Pilih Mata Pelajaran"
            value={selectedSubjectForGradeDeletion}
            onChange={(e) => setSelectedSubjectForGradeDeletion(e.target.value)}
          >
            <option value="">Semua Mata Pelajaran</option>
            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </StyledSelect>
          <StyledSelect
            label="Pilih Siswa"
            value={selectedStudentForGradeDeletion}
            onChange={(e) => setSelectedStudentForGradeDeletion(e.target.value)}
            disabled={!selectedClassForGradeDeletion}
          >
            <option value="">Semua Siswa</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </StyledSelect>
        </div>
        <StyledButton onClick={handleFetchGrades} className="mb-4">Cari Nilai</StyledButton>
        {gradeDeletionStatus && (
          <p className="text-sm mt-2" style={{ color: gradeDeletionStatus.startsWith('Error') ? 'red' : 'green' }}>
            {gradeDeletionStatus}
          </p>
        )}

        {gradesToDelete.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <StyledTable headers={gradeColumns.map(c => c.header)}>
              {gradesToDelete.map((grade) => (
                <tr key={grade.id} className="bg-white dark:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{grade.classId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{grade.subjectId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{grade.studentName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{grade.score}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{grade.gradeType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{grade.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                    <button
                      onClick={() => handleDeleteGrade(grade.id)}
                      className="text-red-500 hover:text-red-700 transition duration-300 ease-in-out"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </StyledTable>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseManager;