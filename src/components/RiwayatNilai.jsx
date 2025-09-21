import React, { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import moment from 'moment';

import StyledInput from './StyledInput';
import StyledSelect from './StyledSelect';
import StyledButton from './StyledButton';
import StyledTable from './StyledTable';
import GradeDetailsModal from './GradeDetailsModal';

// Komponen baru ini menerima daftar kelas dan mapel sebagai props
const RiwayatNilai = ({ classes, subjects }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [riwayatData, setRiwayatData] = useState([]);
  const [isFetching, setIsFetching] = useState(false);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const handleShowHistory = async () => {
    if (!startDate || !endDate || !selectedClass || !selectedSubject) {
      alert('Silakan pilih rentang tanggal, kelas, dan mata pelajaran.');
      return;
    }
    setIsFetching(true);
    try {
      const studentsQuery = query(
        collection(db, 'students'),
        where('userId', '==', auth.currentUser.uid),
        where('rombel', '==', selectedClass)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const allStudentsInClass = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const gradesQuery = query(
        collection(db, 'grades'),
        where('userId', '==', auth.currentUser.uid),
        where('className', '==', selectedClass),
        where('subjectName', '==', selectedSubject),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      const querySnapshot = await getDocs(gradesQuery);
      const submittedGrades = querySnapshot.docs.map(doc => doc.data());

      const gradesByDate = submittedGrades.reduce((acc, grade) => {
        const date = grade.date;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(grade);
        return acc;
      }, {});

      const dateList = [];
      const start = moment(startDate);
      const end = moment(endDate);

      for (let m = start; m.isSameOrBefore(end); m.add(1, 'days')) {
        const currentDate = m.format('YYYY-MM-DD');
        const gradesForThisDate = gradesByDate[currentDate] || [];

        if (gradesForThisDate.length > 0) {
          let allGradesSubmitted = true;
          allStudentsInClass.forEach(student => {
            const studentGrade = gradesForThisDate.find(grade => grade.studentId === student.id);
            if (!studentGrade || parseFloat(studentGrade.score) === 0) {
              allGradesSubmitted = false;
            }
          });

          const status = allGradesSubmitted ? 'Semua nilai terinput' : 'Sebagian nilai kosong';
          const details = [...new Set(gradesForThisDate.map(g => `${g.assessmentType} - ${g.material}`))].join(', ');

          dateList.push({ date: currentDate, status, details });
        }
      }
      setRiwayatData(dateList.sort((a, b) => new Date(b.date) - new Date(a.date))); // Sort descending
    } catch (error) {
      console.error("Error fetching grade history: ", error);
      alert("Gagal memuat riwayat nilai.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleShowDetails = (date) => {
    setSelectedDate(date);
    setShowDetailsModal(true);
  };

  const riwayatNilaiColumns = [
    { header: { label: 'Tanggal' }, accessor: 'date' },
    { header: { label: 'Status' }, accessor: 'status' },
    { header: { label: 'Keterangan' }, accessor: 'details' },
    { header: { label: 'Aksi' }, accessor: 'actions' },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm">
          <StyledInput type="date" label="Tanggal Mulai" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <StyledInput type="date" label="Tanggal Akhir" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <StyledSelect label="Kelas" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="">Pilih Kelas</option>
            {classes.map(c => <option key={c.id} value={c.rombel}>{c.rombel}</option>)}
          </StyledSelect>
          <StyledSelect label="Mata Pelajaran" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
            <option value="">Pilih Mata Pelajaran</option>
            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </StyledSelect>
          <StyledButton onClick={handleShowHistory} disabled={isFetching}>
            {isFetching ? 'Mencari...' : 'Tampilkan Riwayat'}
          </StyledButton>
        </div>

        {riwayatData.length > 0 && (
          <div className="p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm">
            <div className="overflow-x-auto mt-4">
              <StyledTable headers={riwayatNilaiColumns.map(c => c.header)}>
                {riwayatData.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{moment(row.date).format('DD MMMM YYYY')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${row.status.includes('Semua') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-800 dark:text-gray-200">{row.details}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      <StyledButton onClick={() => handleShowDetails(row.date)}>Detail</StyledButton>
                    </td>
                  </tr>
                ))}
              </StyledTable>
            </div>
          </div>
        )}
      </div>

      {showDetailsModal && (
        <GradeDetailsModal
          date={selectedDate}
          selectedClass={selectedClass}
          selectedSubject={selectedSubject}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </>
  );
};

export default RiwayatNilai;
