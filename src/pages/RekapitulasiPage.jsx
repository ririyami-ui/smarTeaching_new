import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import StyledInput from '../components/StyledInput';
import StyledSelect from '../components/StyledSelect';
import StyledButton from '../components/StyledButton';
import StyledTable from '../components/StyledTable';
import PieChart from '../components/PieChart';
import { generateAttendanceRecapPDF, generateJurnalRecapPDF, generateNilaiRecapPDF, generateViolationRecapPDF } from '../utils/pdfGenerator';
import { getAllGrades, getAllAttendance, getAllInfractions } from '../utils/analysis';

const RekapitulasiPage = () => {
  const [activeTab, setActiveTab] = useState('kehadiran');
  
  // General State
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  const [teacherName, setTeacherName] = useState('');

  // Kehadiran State
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [chartData, setChartData] = useState({ Hadir: 0, Sakit: 0, Ijin: 0, Alpha: 0 });
  const [numDays, setNumDays] = useState(0);

  // Jurnal State
  const [jurnalStartDate, setJurnalStartDate] = useState('');
  const [jurnalEndDate, setJurnalEndDate] = useState('');
  const [jurnalData, setJurnalData] = useState([]);

  // Nilai State
  const [nilaiStartDate, setNilaiStartDate] = useState('');
  const [nilaiEndDate, setNilaiEndDate] = useState('');
  const [selectedNilaiClass, setSelectedNilaiClass] = useState('');
  const [selectedNilaiSubject, setSelectedNilaiSubject] = useState('');
  const [nilaiData, setNilaiData] = useState([]);

  // Pelanggaran State
  const [violationStartDate, setViolationStartDate] = useState('');
  const [violationEndDate, setViolationEndDate] = useState('');
  const [selectedViolationClass, setSelectedViolationClass] = useState('');
  const [violationData, setViolationData] = useState([]);

  

  useEffect(() => {
    const fetchInitialData = async () => {
      if (auth.currentUser) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const profileData = docSnap.data();
          setUserProfile(profileData);
          setSchoolName(profileData.schoolName || '');
          setTeacherName(profileData.name || auth.currentUser.email);
        }

        const classesQuery = query(collection(db, 'classes'), where('userId', '==', auth.currentUser.uid));
        const classesSnapshot = await getDocs(classesQuery);
        const fetchedClasses = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.rombel.localeCompare(b.rombel));
        setClasses(fetchedClasses);
        console.log('Classes State:', fetchedClasses);

        const subjectsQuery = query(collection(db, 'subjects'), where('userId', '==', auth.currentUser.uid));
        const subjectsSnapshot = await getDocs(subjectsQuery);
        const fetchedSubjects = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.name.localeCompare(b.name));
        setSubjects(fetchedSubjects);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      const classToFetch = selectedClass || selectedViolationClass;
      if (classToFetch) {
        const studentsQuery = query(
          collection(db, 'students'),
          where('userId', '==', auth.currentUser.uid),
          where('rombel', '==', classToFetch)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        const fetchedStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStudents(fetchedStudents.sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        setStudents([]);
      }
    };
    fetchStudents();
  }, [selectedClass, selectedViolationClass]);

  const handleApplyFilter = async () => {
    if (!startDate || !endDate || !selectedClass) {
      alert('Silakan pilih rentang tanggal dan kelas.');
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    setNumDays(dayDiff);
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('userId', '==', auth.currentUser.uid),
      where('rombel', '==', selectedClass),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const querySnapshot = await getDocs(attendanceQuery);
    const rawDocs = querySnapshot.docs.map(doc => doc.data());
    let summary = {};
    students.forEach(student => {
      summary[student.id] = { absen: student.absen, nis: student.nis, name: student.name, Hadir: 0, Sakit: 0, Ijin: 0, Alpha: 0 };
    });
    rawDocs.forEach(record => {
      if (summary[record.studentId] && record.status) {
        summary[record.studentId][record.status]++;
      }
    });
    const tableData = Object.values(summary);
    setAttendanceData(tableData);
    const totalSummary = tableData.reduce((acc, curr) => {
        acc.Hadir += curr.Hadir;
        acc.Sakit += curr.Sakit;
        acc.Ijin += curr.Ijin;
        acc.Alpha += curr.Alpha;
        return acc;
    }, { Hadir: 0, Sakit: 0, Ijin: 0, Alpha: 0 });
    setChartData(totalSummary);
  };

  const handleKehadiranPDFExport = () => {
    if (attendanceData.length === 0) {
      alert('Tidak ada data kehadiran untuk diekspor ke PDF.');
      return;
    }
    const pdfData = attendanceData.map(item => ({
      absen: item.absen ? String(item.absen) : '',
      nis: item.nis || '',
      namaSiswa: item.name || '',
      gender: item.gender || '',
      hadir: item.Hadir || 0,
      sakit: item.Sakit || 0,
      ijin: item.Ijin || 0,
      alpa: item.Alpha || 0,
    }));
    generateAttendanceRecapPDF(pdfData, schoolName, startDate, endDate, teacherName, selectedClass);
  };

  const handleShowJurnal = async () => {
    if (!jurnalStartDate || !jurnalEndDate) {
      alert('Silakan pilih rentang tanggal.');
      return;
    }
    const journalsQuery = query(
      collection(db, 'teachingJournals'),
      where('userId', '==', auth.currentUser.uid),
      where('date', '>=', jurnalStartDate),
      where('date', '<=', jurnalEndDate)
    );
    const querySnapshot = await getDocs(journalsQuery);
    const fetchedJournals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => new Date(b.date) - new Date(a.date));
    setJurnalData(fetchedJournals);
  };

  const handleJurnalExport = () => {
    if (jurnalData.length === 0) {
      alert('Tidak ada data jurnal untuk diekspor ke PDF.');
      return;
    }
    generateJurnalRecapPDF(jurnalData, jurnalStartDate, jurnalEndDate, teacherName, userProfile);
  };

  const handleApplyNilaiFilter = async () => {
    if (!nilaiStartDate || !nilaiEndDate || !selectedNilaiClass || !selectedNilaiSubject) {
      alert('Silakan pilih rentang tanggal, kelas, dan mata pelajaran.');
      return;
    }
    if (!auth.currentUser) {
      alert('Anda harus login untuk melihat rekapitulasi nilai.');
      return;
    }
    const selectedClassObj = classes.find(c => c.rombel === selectedNilaiClass);
    const selectedSubjectObj = subjects.find(s => s.name === selectedNilaiSubject);
    if (!selectedClassObj || !selectedSubjectObj) {
      alert('Kelas atau mata pelajaran tidak ditemukan.');
      return;
    }
    const studentsQuery = query(
      collection(db, 'students'),
      where('userId', '==', auth.currentUser.uid),
      where('rombel', '==', selectedNilaiClass)
    );
    const studentsSnapshot = await getDocs(studentsQuery);
    const fetchedStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const gradesQuery = query(
      collection(db, 'grades'),
      where('userId', '==', auth.currentUser.uid),
      where('classId', '==', selectedClassObj.id),
      where('subjectId', '==', selectedSubjectObj.id),
      where('date', '>=', nilaiStartDate),
      where('date', '<=', nilaiEndDate)
    );
    const querySnapshot = await getDocs(gradesQuery);
    const rawGrades = querySnapshot.docs.map(doc => doc.data());
    const recapitulation = {};
    fetchedStudents.forEach(student => {
      recapitulation[student.id] = {
        absen: student.absen,
        nis: student.nis,
        name: student.name,
        NH: [],
        Formatif: [],
        Sumatif: [],
      };
    });
    rawGrades.forEach(grade => {
      if (recapitulation[grade.studentId]) {
        const score = parseFloat(grade.score);
        if (!isNaN(score)) {
          if (grade.assessmentType === 'Harian') {
            recapitulation[grade.studentId].NH.push(score);
          } else if (grade.assessmentType === 'Formatif') {
            recapitulation[grade.studentId].Formatif.push(score);
          } else if (grade.assessmentType === 'Sumatif') {
            recapitulation[grade.studentId].Sumatif.push(score);
          }
        }
      }
    });
    const finalNilaiData = Object.values(recapitulation).map(studentData => {
      const NH_avg = studentData.NH.length > 0 ? studentData.NH.reduce((a, b) => a + b, 0) / studentData.NH.length : 0;
      const Formatif_avg = studentData.Formatif.length > 0 ? studentData.Formatif.reduce((a, b) => a + b, 0) / studentData.Formatif.length : 0;
      const Sumatif_avg = studentData.Sumatif.length > 0 ? studentData.Sumatif.reduce((a, b) => a + b, 0) / studentData.Sumatif.length : 0;
      const averages = [NH_avg, Formatif_avg, Sumatif_avg].filter(avg => avg > 0);
      const NA = averages.length > 0 ? averages.reduce((a, b) => a + b, 0) / averages.length : 0;
      return {
        absen: studentData.absen,
        nis: studentData.nis,
        name: studentData.name,
        NH_avg: NH_avg.toFixed(2),
        Formatif_avg: Formatif_avg.toFixed(2),
        Sumatif_avg: Sumatif_avg.toFixed(2),
        NA: NA.toFixed(2),
      };
    }).sort((a, b) => a.absen - b.absen);
    setNilaiData(finalNilaiData);
  };

  const handleNilaiPDFExport = () => {
    if (nilaiData.length === 0) {
      alert('Tidak ada data nilai untuk diekspor ke PDF.');
      return;
    }
    generateNilaiRecapPDF(nilaiData, schoolName, nilaiStartDate, nilaiEndDate, teacherName, selectedNilaiClass, selectedNilaiSubject, userProfile);
  };

  const calculateNilaiSikap = (currentScore) => {
    if (currentScore > 90) return 'Sangat Baik';
    else if (currentScore >= 75) return 'Baik';
    else if (currentScore >= 60) return 'Cukup';
    else return 'Kurang';
  };

  const generateDeskripsi = (studentName, studentViolations, currentScore, nilaiSikap) => {
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

  const handleApplyViolationFilter = async () => {
    console.log('Selected Violation Class:', selectedViolationClass);
    if (!violationStartDate || !violationEndDate || !selectedViolationClass) {
      alert('Silakan pilih rentang tanggal dan kelas.');
      return;
    }
    if (!auth.currentUser) {
      alert('Anda harus login untuk melihat rekapitulasi pelanggaran.');
      return;
    }

    const studentsQuery = query(
      collection(db, 'students'),
      where('userId', '==', auth.currentUser.uid),
      where('rombel', '==', selectedViolationClass)
    );
    const studentsSnapshot = await getDocs(studentsQuery);
    const fetchedStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Fetched Students:', fetchedStudents);

    const selectedClassObj = classes.find(c => c.rombel === selectedViolationClass);
    if (!selectedClassObj) {
      alert('Kelas tidak ditemukan.');
      return;
    }
    console.log('Selected Class ID:', selectedClassObj.id);

    const endOfDay = new Date(violationEndDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('violationStartDate:', violationStartDate);
    console.log('violationEndDate:', violationEndDate);
    console.log('Query Start Date (ISO):', new Date(violationStartDate).toISOString());
    console.log('Query End Date (ISO):', endOfDay.toISOString());

    const violationsQuery = query(
      collection(db, 'infractions'),
      where('userId', '==', auth.currentUser.uid),
      where('classId', '==', selectedViolationClass),
      where('date', '>=', new Date(violationStartDate).toISOString()),
      where('date', '<=', endOfDay.toISOString())
    );
    const violationsSnapshot = await getDocs(violationsQuery);
    const rawViolations = violationsSnapshot.docs.map(doc => doc.data());
    console.log('Raw Violations:', rawViolations);

    const studentViolationSummary = {};
    fetchedStudents.forEach(student => {
      studentViolationSummary[student.id] = {
        absen: student.absen,
        nis: student.nis,
        name: student.name,
        gender: student.gender,
        violationCount: 0,
        totalPointsDeducted: 0,
        violationsDetail: [],
        nilaiSikap: '',
        deskripsi: '',
      };
    });
    console.log('Initial Student Violation Summary:', studentViolationSummary);

    rawViolations.forEach(violation => {
      if (studentViolationSummary[violation.studentId]) {
        studentViolationSummary[violation.studentId].violationCount++;
        studentViolationSummary[violation.studentId].totalPointsDeducted += violation.points;
        studentViolationSummary[violation.studentId].violationsDetail.push(violation);
      }
    });
    console.log('Student Violation Summary after processing violations:', studentViolationSummary);

    const finalViolationData = Object.values(studentViolationSummary).map(studentData => {
      const currentScore = 100 - studentData.totalPointsDeducted;
      const nilaiSikap = calculateNilaiSikap(currentScore);
      const deskripsi = generateDeskripsi(studentData.name, studentData.violationsDetail, currentScore, nilaiSikap);
      return {
        ...studentData,
        nilaiSikap,
        deskripsi,
      };
    }).sort((a, b) => a.absen - b.absen);
    console.log('Final Violation Data:', finalViolationData);

    setViolationData(finalViolationData);
  };

  const handleViolationPDFExport = () => {
    if (violationData.length === 0) {
      alert('Tidak ada data pelanggaran untuk diekspor ke PDF.');
      return;
    }
    generateViolationRecapPDF(violationData, schoolName, violationStartDate, violationEndDate, teacherName, selectedViolationClass, userProfile);
  };

  

  const renderTabButton = (tabName, tabLabel) => {
    const isActive = activeTab === tabName;
    return (
      <button
        className={`flex-shrink-0 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all duration-300 ease-in-out focus:outline-none ${isActive ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-text-muted-light dark:text-text-muted-dark hover:bg-white/60 dark:hover:bg-surface-dark/60'}`}
        onClick={() => setActiveTab(tabName)}
      >
        {tabLabel}
      </button>
    );
  };

  const kehadiranColumns = [
    { header: { label: 'Nama Siswa' }, accessor: 'name' },
    { header: { label: 'Hadir' }, accessor: 'Hadir' },
    { header: { label: 'Sakit' }, accessor: 'Sakit' },
    { header: { label: 'Ijin' }, accessor: 'Ijin' },
    { header: { label: 'Alpha' }, accessor: 'Alpha' },
  ];

  const jurnalColumns = [
    { header: { label: 'Tanggal' }, accessor: 'date' },
    { header: { label: 'Kelas' }, accessor: 'className' },
    { header: { label: 'Mata Pelajaran' }, accessor: 'subjectName' },
    { header: { label: 'Materi' }, accessor: 'material' },
    { header: { label: 'Tujuan Pembelajaran' }, accessor: 'learningObjectives' },
    { header: { label: 'Kegiatan Pembelajaran' }, accessor: 'learningActivities' },
    { header: { label: 'Refleksi' }, accessor: 'reflection' },
    { header: { label: 'Hambatan' }, accessor: 'challenges' },
    { header: { label: 'Tindak Lanjut' }, accessor: 'followUp' },
  ];

  const nilaiColumns = [
    { header: { label: 'No. Absen' }, accessor: 'absen' },
    { header: { label: 'NIS' }, accessor: 'nis' },
    { header: { label: 'Nama Siswa' }, accessor: 'name' },
    { header: { label: 'Rata-rata NH' }, accessor: 'NH_avg' },
    { header: { label: 'Rata-rata Formatif' }, accessor: 'Formatif_avg' },
    { header: { label: 'Rata-rata Sumatif' }, accessor: 'Sumatif_avg' },
    { header: { label: 'Nilai Akhir (NA)' }, accessor: 'NA' },
  ];

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
    <>
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl font-bold mb-6 text-text-light dark:text-text-dark">Rekapitulasi</h1>
        <div className="max-w-xl mx-auto sm:mx-0">
          <div className="flex space-x-2 p-1.5 bg-gray-100 dark:bg-surface-dark rounded-xl overflow-x-auto">
            {renderTabButton('kehadiran', 'Kehadiran')}
            {renderTabButton('jurnal', 'Jurnal')}
            {renderTabButton('nilai', 'Nilai')}
            {renderTabButton('pelanggaran', 'Pelanggaran')}
          </div>
        </div>
        <div className="mt-6">
          {activeTab === 'kehadiran' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm">
                  <StyledInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <StyledInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  <StyledSelect value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                      <option value="">Pilih Kelas</option>
                      {classes.map(c => <option key={c.id} value={c.rombel}>{c.rombel}</option>)}
                  </StyledSelect>
                  <StyledButton onClick={handleApplyFilter}>Terapkan Filter</StyledButton>
              </div>
              
              {attendanceData.length > 0 && (
                <div className="p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm">
                  <StyledButton onClick={handleKehadiranPDFExport}>Download PDF</StyledButton>
                  <div className="overflow-x-auto mt-4">
                    <StyledTable headers={kehadiranColumns.map(c => c.header)}>
                      {attendanceData.map((row, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}>
                          {kehadiranColumns.map(col => <td key={col.accessor} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{row[col.accessor]}</td>)}
                        </tr>
                      ))}
                    </StyledTable>
                  </div>
                  <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">Grafik Kehadiran</h3>
                      <PieChart data={chartData} numDays={numDays} />
                  </div>
                </div>
              )}

            </div>
          )}
          {activeTab === 'jurnal' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm">
                  <StyledInput type="date" value={jurnalStartDate} onChange={(e) => setJurnalStartDate(e.target.value)} />
                  <StyledInput type="date" value={jurnalEndDate} onChange={(e) => setJurnalEndDate(e.target.value)} />
                  <StyledButton onClick={handleShowJurnal}>Tampilkan Jurnal</StyledButton>
              </div>

              {jurnalData.length > 0 && (
                <div className="p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm">
                  <StyledButton onClick={handleJurnalExport}>Download PDF</StyledButton>
                  <div className="w-full overflow-auto max-h-[600px] mt-4">
                    <StyledTable headers={jurnalColumns.map(c => c.header)}>
                      {jurnalData.map((row, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}>
                          {jurnalColumns.map(col => (
                              <td key={col.accessor} className="px-6 py-4 whitespace-normal text-sm text-gray-800 dark:text-gray-200 min-w-[200px]">
                                  {row[col.accessor] || '-'}
                              </td>
                          ))}
                        </tr>
                      ))}
                    </StyledTable>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'nilai' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm">
                <StyledInput type="date" label="Tanggal Mulai" value={nilaiStartDate} onChange={(e) => setNilaiStartDate(e.target.value)} />
                <StyledInput type="date" label="Tanggal Akhir" value={nilaiEndDate} onChange={(e) => setNilaiEndDate(e.target.value)} />
                <StyledSelect label="Kelas" value={selectedNilaiClass} onChange={(e) => setSelectedNilaiClass(e.target.value)}>
                  <option value="">Pilih Kelas</option>
                  {classes.map(c => <option key={c.id} value={c.rombel}>{c.rombel}</option>)}
                </StyledSelect>
                <StyledSelect label="Mata Pelajaran" value={selectedNilaiSubject} onChange={(e) => setSelectedNilaiSubject(e.target.value)}>
                  <option value="">Pilih Mata Pelajaran</option>
                  {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </StyledSelect>
                <StyledButton onClick={handleApplyNilaiFilter}>Terapkan Filter</StyledButton>
                <StyledButton onClick={handleNilaiPDFExport} disabled={nilaiData.length === 0}>Download PDF</StyledButton>
              </div>

              {nilaiData.length > 0 && (
                <div className="p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm">
                  <div className="overflow-x-auto mt-4">
                    <StyledTable headers={nilaiColumns.map(c => c.header)}>
                      {nilaiData.map((row, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}>
                          {nilaiColumns.map(col => <td key={col.accessor} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{row[col.accessor]}</td>)}
                        </tr>
                      ))}
                    </StyledTable>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'pelanggaran' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm">
                <StyledInput type="date" label="Tanggal Mulai" value={violationStartDate} onChange={(e) => setViolationStartDate(e.target.value)} />
                <StyledInput type="date" label="Tanggal Akhir" value={violationEndDate} onChange={(e) => setViolationEndDate(e.target.value)} />
                <StyledSelect label="Kelas" value={selectedViolationClass} onChange={(e) => setSelectedViolationClass(e.target.value)}>
                  <option value="">Pilih Kelas</option>
                  {classes.map(c => <option key={c.id} value={c.rombel}>{c.rombel}</option>)}
                </StyledSelect>
                <StyledButton onClick={handleApplyViolationFilter}>Terapkan Filter</StyledButton>
                <StyledButton onClick={handleViolationPDFExport} disabled={violationData.length === 0}>Download PDF</StyledButton>
              </div>

              {violationData.length > 0 && (
                <div className="p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm">
                  <div className="overflow-x-auto mt-4">
                    <StyledTable headers={pelanggaranColumns.map(c => c.header)}>
                      {violationData.map((row, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}>
                          {pelanggaranColumns.map(col => <td key={col.accessor} className="px-6 py-4 whitespace-normal text-sm text-gray-800 dark:text-gray-200">{row[col.accessor]}</td>)}
                        </tr>
                      ))}
                    </StyledTable>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RekapitulasiPage;
