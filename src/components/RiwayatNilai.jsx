import React, { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import moment from 'moment';

import StyledInput from './StyledInput';
import StyledSelect from './StyledSelect';
import StyledButton from './StyledButton';
import StyledTable from './StyledTable';
import GradeDetailsModal from './GradeDetailsModal';
import { useSettings } from '../utils/SettingsContext';

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
  const [selectedAssessmentType, setSelectedAssessmentType] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const { activeSemester, academicYear } = useSettings();

  const handleShowHistory = async () => {
    if (!startDate || !endDate || !selectedClass || !selectedSubject) {
      alert('Silakan pilih rentang tanggal, kelas, dan mata pelajaran.');
      return;
    }
    setIsFetching(true);
    try {
      const classObj = classes.find(c => c.id === selectedClass);
      const subjectObj = subjects.find(s => s.id === selectedSubject);

      let studentsQuery = query(
        collection(db, 'students'),
        where('userId', '==', auth.currentUser.uid),
        where('classId', '==', selectedClass)
      );
      let studentsSnapshot = await getDocs(studentsQuery);

      // Fallback for legacy students
      if (studentsSnapshot.empty && classObj) {
        studentsQuery = query(
          collection(db, 'students'),
          where('userId', '==', auth.currentUser.uid),
          where('rombel', '==', classObj.rombel)
        );
        studentsSnapshot = await getDocs(studentsQuery);
      }
      const allStudentsInClass = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      let gradesQuery = query(
        collection(db, 'grades'),
        where('userId', '==', auth.currentUser.uid),
        where('classId', '==', selectedClass),
        where('subjectId', '==', selectedSubject),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear)
      );
      let querySnapshot = await getDocs(gradesQuery);

      // Fallback for legacy grades
      if (querySnapshot.empty && classObj && subjectObj) {
        gradesQuery = query(
          collection(db, 'grades'),
          where('userId', '==', auth.currentUser.uid),
          where('className', '==', classObj.rombel),
          where('subjectName', '==', subjectObj.name),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          where('semester', '==', activeSemester),
          where('academicYear', '==', academicYear)
        );
        querySnapshot = await getDocs(gradesQuery);
      }

      const submittedGrades = querySnapshot.docs.map(doc => doc.data());

      const gradesBySession = submittedGrades.reduce((acc, grade) => {
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
      }, {});

      const sessionList = Object.values(gradesBySession).map(session => {
        let allGradesSubmitted = true;
        allStudentsInClass.forEach(student => {
          const studentGrade = session.grades.find(grade => grade.studentId === student.id);
          if (!studentGrade || parseFloat(studentGrade.score) === 0) {
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

      setRiwayatData(sessionList.sort((a, b) => new Date(b.date) - new Date(a.date))); // Sort descending
    } catch (error) {
      console.error("Error fetching grade history: ", error);
      alert("Gagal memuat riwayat nilai.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleShowDetails = (item) => {
    setSelectedDate(item.date);
    setSelectedAssessmentType(item.assessmentType);
    setSelectedMaterial(item.material);
    setShowDetailsModal(true);
  };

  const riwayatNilaiColumns = [
    { header: { label: 'Tanggal' }, accessor: 'date' },
    { header: { label: 'Status' }, accessor: 'status' },
    { header: { label: 'Keterangan' }, accessor: 'details' },
    { header: { label: 'Aksi' }, accessor: 'actions' },
  ];


  const handleQuickFilter = (range) => {
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
      case 'semester':
        // Rough estimate for semester: 6 months back from today or based on current month
        const currentMonth = today.month();
        if (currentMonth >= 6) { // July onwards (Sem 1)
          start = today.clone().month(6).startOf('month').format('YYYY-MM-DD'); // July 1st
          end = today.clone().month(11).endOf('month').format('YYYY-MM-DD'); // Dec 31st
        } else { // Jan - June (Sem 2)
          start = today.clone().month(0).startOf('month').format('YYYY-MM-DD'); // Jan 1st
          end = today.clone().month(5).endOf('month').format('YYYY-MM-DD'); // June 30th
        }
        break;
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

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm">
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
                      <StyledButton onClick={() => handleShowDetails(row)}>Detail & Edit</StyledButton>
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
          assessmentType={selectedAssessmentType}
          material={selectedMaterial}
          selectedClass={selectedClass}
          selectedSubject={selectedSubject}
          onClose={() => setShowDetailsModal(false)}
          classes={classes}
          subjects={subjects}
        />
      )}
    </>
  );
};

export default RiwayatNilai;
