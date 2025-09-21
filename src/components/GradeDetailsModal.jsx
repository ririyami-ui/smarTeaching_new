import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import StyledButton from './StyledButton';
import StyledTable from './StyledTable';

const GradeDetailsModal = ({ date, selectedClass, selectedSubject, onClose }) => {
  const [studentGrades, setStudentGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradeStatus, setGradeStatus] = useState('');

  useEffect(() => {
    const fetchGradeDetails = async () => {
      setLoading(true);
      try {
        // Fetch all students in the selected class
        const studentsQuery = query(
          collection(db, 'students'),
          where('userId', '==', auth.currentUser.uid),
          where('rombel', '==', selectedClass),
          orderBy('name', 'asc')
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        const fetchedStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch grades for the specific date, class, and subject
        const gradesQuery = query(
          collection(db, 'grades'),
          where('userId', '==', auth.currentUser.uid),
          where('date', '==', date),
          where('className', '==', selectedClass),
          where('subjectName', '==', selectedSubject)
        );
        const gradesSnapshot = await getDocs(gradesQuery);
        const fetchedGrades = gradesSnapshot.docs.map(doc => doc.data());

        const gradesMap = new Map();
        fetchedGrades.forEach(grade => {
          gradesMap.set(grade.studentId, grade.score);
        });

        const combinedData = fetchedStudents.map(student => ({
          id: student.id,
          name: student.name,
          nis: student.nis,
          score: gradesMap.has(student.id) ? gradesMap.get(student.id) : 'Belum Ada',
        }));

        setStudentGrades(combinedData);

        // Determine grade status
        const allStudentsHaveGrades = combinedData.every(student => student.score !== 'Belum Ada');
        if (allStudentsHaveGrades) {
          setGradeStatus('Nilai terinput semua');
        } else {
          setGradeStatus('Sebagian siswa nilai masih kosong');
        }

      } catch (error) {
        console.error('Error fetching grade details:', error);
        // Handle error, maybe show an alert
      } finally {
        setLoading(false);
      }
    };

    if (date && selectedClass && selectedSubject && auth.currentUser) {
      fetchGradeDetails();
    }
  }, [date, selectedClass, selectedSubject, auth.currentUser]);

  const columns = [
    { header: { label: 'NIS' }, accessor: 'nis' },
    { header: { label: 'Nama Siswa' }, accessor: 'name' },
    { header: { label: 'Nilai' }, accessor: 'score' },
  ];

  if (!date || !selectedClass || !selectedSubject) {
    return null; // Don't render if essential props are missing
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Detail Nilai Tanggal: {date}</h3>
          <StyledButton onClick={onClose}>X</StyledButton>
        </div>
        <p className="mb-4 text-text-muted-light dark:text-text-muted-dark">Status: {gradeStatus}</p>
        {loading ? (
          <p className="text-text-muted-light dark:text-text-muted-dark">Memuat detail nilai...</p>
        ) : (
          <div className="overflow-x-auto">
            <StyledTable headers={columns.map(col => col.header)}>
              {studentGrades.map((row, index) => (
                <tr key={row.id} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}>
                  {columns.map(col => (
                    <td key={col.accessor} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))}
            </StyledTable>
          </div>
        )}
      </div>
    </div>
  );
};

export default GradeDetailsModal;
