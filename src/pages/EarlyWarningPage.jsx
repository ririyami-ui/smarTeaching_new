import React, { useState, useEffect, useMemo } from 'react';
import { auth } from '../firebase';
import { runEarlyWarningAnalysis, getAllStudents } from '../utils/analysis';
import Modal from '../components/Modal';
import StudentWarningDetails from '../components/StudentWarningDetails';
import StyledSelect from '../components/StyledSelect';

const EarlyWarningPage = () => {
  const [flaggedStudents, setFlaggedStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]); // To store all students for class filtering
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedClass, setSelectedClass] = useState(''); // State for selected class filter

  const handleOpenModal = (student) => {
    setSelectedStudent(student);
  };

  const handleCloseModal = () => {
    setSelectedStudent(null);
  };

  useEffect(() => {
    const performAnalysis = async () => {
      if (auth.currentUser) {
        setIsLoading(true);
        const [flaggedResults, allStudentsData] = await Promise.all([
          runEarlyWarningAnalysis(auth.currentUser.uid),
          getAllStudents(auth.currentUser.uid)
        ]);
        setFlaggedStudents(flaggedResults);
        setAllStudents(allStudentsData);
        setIsLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        performAnalysis();
      } else {
        setIsLoading(false);
        setFlaggedStudents([]);
        setAllStudents([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(allStudents.map(student => student.rombel));
    return ['', ...Array.from(classes).sort()]; // Add empty string for "All Classes" option
  }, [allStudents]);

  const filteredFlaggedStudents = useMemo(() => {
    if (selectedClass === '') {
      return flaggedStudents;
    }
    return flaggedStudents.filter(student => student.rombel === selectedClass);
  }, [flaggedStudents, selectedClass]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary"></div>
        <p className="ml-4 text-lg">Menganalisis data siswa...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Sistem Peringatan Dini</h1>
      
      <div className="mb-4">
        <label htmlFor="class-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter berdasarkan Kelas</label>
        <StyledSelect
          id="class-filter"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          {uniqueClasses.map(cls => (
            <option key={cls} value={cls}>
              {cls === '' ? 'Semua Kelas' : cls}
            </option>
          ))}
        </StyledSelect>
      </div>

      {filteredFlaggedStudents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFlaggedStudents.map(student => (
            <button 
              key={student.id} 
              onClick={() => handleOpenModal(student)}
              className="bg-white text-left dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-red-500 hover:shadow-xl hover:border-red-700 transition-all duration-200">
              <h2 className="text-xl font-bold text-red-500">{student.name}</h2>
              <p className="text-sm text-gray-500 mb-4">Kelas: {student.rombel}</p>
              <ul className="list-disc list-inside space-y-2">
                {student.warnings.map((warning, index) => (
                  <li key={index} className="text-gray-700 dark:text-gray-300">{warning}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
          <p className="text-lg">Tidak ada siswa yang teridentifikasi memerlukan perhatian khusus saat ini.</p>
        </div>
      )}

      {selectedStudent && (
        <Modal onClose={handleCloseModal}>
          <StudentWarningDetails student={selectedStudent} />
        </Modal>
      )}
    </div>
  );
};

export default EarlyWarningPage;