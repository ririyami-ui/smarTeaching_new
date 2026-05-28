import React, { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';

import StyledInput from './StyledInput';
import StyledSelect from './StyledSelect';
import StyledButton from './StyledButton';
import StyledTable from './StyledTable';

interface ClassItem {
  id: string;
  rombel: string;
}

interface SubjectItem {
  id: string;
  name: string;
}

interface RekapitulasiNilaiProps {
  classes: ClassItem[];
  subjects: SubjectItem[];
}

interface StudentDoc {
  id: string;
  name: string;
  absen?: string;
  nis?: string;
}

interface StudentScoreData {
  name: string;
  absen?: string;
  scores: number[];
  lowScores: number;
}

interface StudentSummary {
  absen?: string;
  name: string;
  average: string;
  lowScoreCount: number;
  testCount: number;
}

const RekapitulasiNilai = ({ classes, subjects }: RekapitulasiNilaiProps) => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [summaryData, setSummaryData] = useState<StudentSummary[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  const handleShowSummary = async () => {
    if (!startDate || !endDate || !selectedClass || !selectedSubject) {
      alert('Silakan pilih rentang tanggal, kelas, dan mata pelajaran.');
      return;
    }
    if (!user) return;
    setIsFetching(true);
    try {
      const studentsQuery = query(
        collection(db, 'students'),
        where('userId', '==', user.uid),
        where('classId', '==', selectedClass)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const allStudentsInClass = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentDoc))
        .sort((a, b) => {
          const absenA = parseInt(String(a.absen)) || 0;
          const absenB = parseInt(String(b.absen)) || 0;
          if (absenA !== absenB) return absenA - absenB;
          return a.name.localeCompare(b.name);
        });

      // Resolve subject name for client-side fallback matching
      const selectedSubjectObj = subjects.find(s => s.id === selectedSubject);
      const selectedSubjectName = selectedSubjectObj?.name || '';

      // Query without subjectId to catch grades with old/different subject IDs
      const gradesQuery = query(
        collection(db, 'grades'),
        where('userId', '==', user.uid),
        where('classId', '==', selectedClass),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      const querySnapshot = await getDocs(gradesQuery);

      // Client-side filter by subjectId OR subjectName
      const submittedGrades = querySnapshot.docs
        .map(doc => doc.data())
        .filter(grade =>
          grade.subjectId === selectedSubject ||
          (selectedSubjectName && grade.subjectName === selectedSubjectName)
        );

      const studentScores: Record<string, StudentScoreData> = {};
      allStudentsInClass.forEach(student => {
        studentScores[student.id] = {
          name: student.name,
          absen: student.absen,
          scores: [],
          lowScores: 0,
        };
      });

      submittedGrades.forEach(grade => {
        if (studentScores[grade.studentId]) {
          const score = parseFloat(grade.score);
          studentScores[grade.studentId].scores.push(score);
          if (score < 75) { // Adjusted to a more common default KKM
            studentScores[grade.studentId].lowScores++;
          }
        }
      });

      const summary = allStudentsInClass.map(student => {
        const data = studentScores[student.id];
        const totalScore = data.scores.reduce((acc: number, score: number) => acc + score, 0);
        const averageScore = data.scores.length > 0 ? (totalScore / data.scores.length).toFixed(1) : '-';
        return {
          absen: student.absen,
          name: student.name,
          average: averageScore,
          lowScoreCount: data.lowScores,
          testCount: data.scores.length,
        } as StudentSummary;
      });
      setSummaryData(summary);
    } catch (error) {
      console.error("Error fetching grade summary: ", error);
      alert("Gagal memuat rekapitulasi nilai.");
    } finally {
      setIsFetching(false);
    }
  };

  const summaryColumns = [
    { header: { label: 'No' } },
    { header: { label: 'Nama Siswa' } },
    { header: { label: 'Rata-rata' } },
    { header: { label: 'Dibawah KKM' } },
    { header: { label: 'Total Penilaian' } },
  ];

  return (
    <div className="space-y-6">
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
        <StyledButton onClick={handleShowSummary} disabled={isFetching}>
          {isFetching ? 'Mencari...' : 'Tampilkan Rekapitulasi'}
        </StyledButton>
      </div>

      {summaryData.length > 0 && (
        <div className="p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm">
          <div className="overflow-x-auto mt-4">
            <StyledTable headers={summaryColumns.map(c => c.header)}>
              {summaryData.map((student, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 font-bold">{student.absen}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600 dark:text-purple-400">{student.average}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 font-medium">{student.lowScoreCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{student.testCount}</td>
                </tr>
              ))}
            </StyledTable>
          </div>
        </div>
      )}
    </div>
  );
};

export default RekapitulasiNilai;
