import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import StyledInput from './StyledInput';
import StyledSelect from './StyledSelect';
import StyledButton from './StyledButton';
import StyledTable from './StyledTable';
import { generatePelanggaranRecapPDF } from '../utils/pdfGenerator';

const RekapPelanggaranTab = ({ classes, schoolName, teacherName, userProfile }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [violations, setViolations] = useState([]);
  const [recapData, setRecapData] = useState([]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (selectedClass && auth.currentUser) {
        const studentsQuery = query(
          collection(db, 'students'),
          where('userId', '==', auth.currentUser.uid),
          where('rombel', '==', selectedClass)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        const fetchedStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStudents(fetchedStudents.sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        setStudents([]);
      }
    };
    fetchStudents();
  }, [selectedClass]);

  const calculateNilaiSikap = (currentScore) => {
    if (currentScore > 90) return 'Sangat Baik';
    else if (currentScore >= 75) return 'Baik';
    else if (currentScore >= 60) return 'Cukup';
    else return 'Kurang';
  };

  const generateDeskripsi = (studentViolations, currentScore, nilaiSikap) => {
    if (studentViolations.length === 0) {
      return `Tidak ada catatan pelanggaran. Nilai Sikap: ${nilaiSikap} (Skor: ${currentScore})`;
    }

    const groupedViolations = studentViolations.reduce((acc, v) => {
      if (!acc[v.infractionType]) {
        acc[v.infractionType] = { count: 0, totalPoints: 0 };
      }
      acc[v.infractionType].count++;
      acc[v.infractionType].totalPoints += v.points;
      return acc;
    }, {});

    const violationDetails = Object.entries(groupedViolations).map(([type, data]) => {
      return `- ${type} (${data.count} kali, ${data.totalPoints} poin)`;
    }).join('\n');

    return `Memiliki catatan pelanggaran:\n${violationDetails}\nNilai Sikap: ${nilaiSikap} (Skor: ${currentScore})`;
  };

  const handleApplyFilter = async () => {
    if (!startDate || !endDate || !selectedClass) {
      alert('Silakan pilih rentang tanggal dan kelas.');
      return;
    }
    if (!auth.currentUser) {
      alert('Anda harus login untuk melihat rekapitulasi pelanggaran.');
      return;
    }

    const violationsQuery = query(
      collection(db, 'infractions'),
      where('userId', '==', auth.currentUser.uid),
      where('classId', '==', selectedClass),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const querySnapshot = await getDocs(violationsQuery);
    const fetchedViolations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setViolations(fetchedViolations);

    const studentRecap = {};
    students.forEach(student => {
      studentRecap[student.id] = {
        absen: student.absen,
        nis: student.nis,
        name: student.name,
        gender: student.gender,
        violationCount: 0,
        violationsDetail: [],
        nilaiSikap: '',
        deskripsi: '',
      };
    });

    fetchedViolations.forEach(violation => {
      if (studentRecap[violation.studentId]) {
        studentRecap[violation.studentId].violationCount++;
        studentRecap[violation.studentId].violationsDetail.push(violation);
      }
    });

    const finalRecapData = Object.values(studentRecap).map(data => {
      const totalPointsDeducted = data.violationsDetail.reduce((acc, curr) => acc + curr.points, 0);
      const currentScore = 100 - totalPointsDeducted;
      const nilaiSikap = calculateNilaiSikap(currentScore);
      const deskripsi = generateDeskripsi(data.violationsDetail, currentScore, nilaiSikap);
      return {
        ...data,
        totalPointsDeducted,
        currentScore,
        nilaiSikap,
        deskripsi,
      };
    }).sort((a, b) => a.absen - b.absen);

    setRecapData(finalRecapData);
  };

  const handlePDFExport = () => {
    if (recapData.length === 0) {
      alert('Tidak ada data pelanggaran untuk diekspor ke PDF.');
      return;
    }
    generatePelanggaranRecapPDF(recapData, schoolName, startDate, endDate, teacherName, selectedClass, userProfile);
  };

  const pelanggaranColumns = [
    { header: { label: 'No. Absen' }, accessor: 'absen' },
    { header: { label: 'NIS' }, accessor: 'nis' },
    { header: { label: 'Nama Siswa' }, accessor: 'name' },
    { header: { label: 'Jenis Kelamin' }, accessor: 'gender' },
    { header: { label: 'Total Poin Pelanggaran' }, accessor: 'totalPointsDeducted' },
    { header: { label: 'Nilai Sikap' }, accessor: 'nilaiSikap' },
    { header: { label: 'Deskripsi' }, accessor: 'deskripsi' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm">
        <StyledInput type="date" label="Tanggal Mulai" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <StyledInput type="date" label="Tanggal Akhir" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <StyledSelect label="Kelas" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
          <option value="">Pilih Kelas</option>
          {classes.map(c => <option key={c.id} value={c.rombel}>{c.rombel}</option>)}
        </StyledSelect>
        <StyledButton onClick={handleApplyFilter}>Terapkan Filter</StyledButton>
      </div>

      {recapData.length > 0 && (
        <div className="p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm">
          <StyledButton onClick={handlePDFExport}>Download PDF</StyledButton>
          <div className="overflow-x-auto mt-4">
            <StyledTable headers={pelanggaranColumns.map(c => c.header)}>
              {recapData.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}>
                  {pelanggaranColumns.map(col => (
                    <td key={col.accessor} className="px-6 py-4 whitespace-normal text-sm text-gray-800 dark:text-gray-200">
                      {row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))}
            </StyledTable>
          </div>
        </div>
      )}
    </div>
  );
};

export default RekapPelanggaranTab;