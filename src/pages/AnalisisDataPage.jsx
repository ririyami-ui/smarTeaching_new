// src/pages/AnalisisDataPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import toast from 'react-hot-toast';
import StyledSelect from '../components/StyledSelect';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Lightbulb, BrainCircuit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateStudentAnalysis } from '../utils/gemini';

const COLORS = ['#4CAF50', '#FFC107', '#FF9800', '#F44336']; // Green, Amber, Orange, Red

const AnalisisSiswaPage = () => {
  const [activeTab, setActiveTab] = useState('analisis');
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentGrades, setStudentGrades] = useState([]);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [studentJournal, setStudentJournal] = useState([]);
  const [studentInfractions, setStudentInfractions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingStudents, setIsFetchingStudents] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      if (user) {
        fetchClasses(user.uid);
      } else {
        setClasses([]);
        setSelectedClass('');
        setStudents([]);
        setSelectedStudentId('');
        setStudentGrades([]);
        setStudentAttendance([]);
        setStudentJournal([]);
        setStudentInfractions([]);
        setAnalysisResult('');
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchClasses = async (uid) => {
    try {
      const q = query(collection(db, 'classes'), where('userId', '==', uid), orderBy('rombel'));
      const querySnapshot = await getDocs(q);
      const classList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(classList);
    } catch (error) {
      console.error("Error fetching classes: ", error);
      toast.error('Gagal memuat data kelas.');
    }
  };

  const fetchStudents = useCallback(async (uid, className) => {
    if (!className) {
      setStudents([]);
      return;
    }
    setIsFetchingStudents(true);
    try {
      const q = query(
        collection(db, 'students'),
        where('userId', '==', uid),
        where('rombel', '==', className),
        orderBy('name')
      );
      const querySnapshot = await getDocs(q);
      const studentList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentList);
    } catch (error) {
      console.error("Error fetching students: ", error);
      toast.error('Gagal memuat data siswa.');
    } finally {
      setIsFetchingStudents(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchStudents(currentUser.uid, selectedClass);
    }
  }, [selectedClass, currentUser, fetchStudents]);

  useEffect(() => {
    if (selectedStudentId && currentUser) {
      setIsLoading(true);
      Promise.all([
        fetchStudentGrades(currentUser.uid, selectedStudentId),
        fetchStudentAttendance(currentUser.uid, selectedStudentId),
        fetchStudentJournal(currentUser.uid, selectedStudentId),
        fetchStudentInfractions(currentUser.uid, selectedStudentId)
      ]).finally(() => setIsLoading(false));
    } else {
      setStudentGrades([]);
      setStudentAttendance([]);
      setStudentJournal([]);
      setStudentInfractions([]);
      setAnalysisResult('');
    }
  }, [selectedStudentId, currentUser]);

  const fetchStudentInfractions = async (uid, studentId) => {
    try {
      const q = query(
        collection(db, 'infractions'),
        where('userId', '==', uid),
        where('studentId', '==', studentId),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const infractionList = querySnapshot.docs.map(doc => doc.data());
      setStudentInfractions(infractionList);
    } catch (error) {
      console.error("Error fetching student infractions: ", error);
    }
  };

  const fetchStudentJournal = async (uid, studentId) => {
    try {
      const q = query(
        collection(db, 'teachingJournals'),
        where('userId', '==', uid),
        where('involvedStudentIds', 'array-contains', studentId),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const journalList = querySnapshot.docs.map(doc => doc.data());
      setStudentJournal(journalList);
    } catch (error) {
      console.error("Error fetching student journal: ", error);
    }
  };

  const fetchStudentAttendance = async (uid, studentId) => {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', uid),
        where('studentId', '==', studentId),
        orderBy('date', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const attendanceList = querySnapshot.docs.map(doc => doc.data());
      setStudentAttendance(attendanceList);
    } catch (error) {
      console.error("Error fetching student attendance: ", error);
      toast.error('Gagal memuat data kehadiran siswa.');
    }
  };

  const fetchStudentGrades = async (uid, studentId) => {
    try {
      const q = query(
        collection(db, 'grades'),
        where('userId', '==', uid),
        where('studentId', '==', studentId),
        orderBy('date', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const gradesList = querySnapshot.docs.map(doc => doc.data());
      setStudentGrades(gradesList);
    } catch (error) {
      console.error("Error fetching student grades: ", error);
      toast.error('Gagal memuat data nilai siswa.');
    } 
  };

  const handleAiAnalysis = async () => {
    if (!selectedStudentId) return;

    setIsAnalyzing(true);
    setAnalysisResult('');
    const studentName = students.find(s => s.id === selectedStudentId)?.name || 'Siswa';

    let prompt = `Anda adalah seorang asisten guru yang ahli dalam menganalisis data siswa. Berikan analisis mendalam dan rekomendasi tindak lanjut yang konkret berdasarkan data berikut untuk siswa bernama ${studentName}. Format jawaban Anda menggunakan markdown.\n\n`;

    prompt += "### Data Nilai\n";
    if (studentGrades.length > 0) {
      studentGrades.forEach(g => {
        prompt += `- Tanggal: ${g.date}, Matpel: ${g.subjectName}, Materi: ${g.material}, Nilai: ${g.score}\n`;
      });
    } else {
      prompt += "Tidak ada data nilai.\n";
    }

    prompt += "\n### Data Kehadiran\n";
    if (studentAttendance.length > 0) {
      const stats = attendanceStats;
      prompt += `- Persentase Kehadiran: ${stats.attendancePercentage}%\n`;
      prompt += `- Rincian: Hadir (${stats.Hadir}), Sakit (${stats.Sakit}), Ijin (${stats.Ijin}), Alpha (${stats.Alpha})\n`;
    } else {
      prompt += "Tidak ada data kehadiran.\n";
    }

    prompt += "\n### Data Pelanggaran\n";
    if (studentInfractions.length > 0) {
      studentInfractions.forEach(i => {
        prompt += `- Tanggal: ${i.date}, Pelanggaran: ${i.infractionType}, Poin: ${i.points}\n`;
      });
    } else {
      prompt += "Tidak ada data pelanggaran.\n";
    }

    prompt += "\n### Catatan Jurnal Guru\n";
    if (studentJournal.length > 0) {
      studentJournal.forEach(j => {
        prompt += `- Tanggal: ${j.date}, Catatan: ${j.notes}\n`;
      });
    } else {
      prompt += "Tidak ada catatan jurnal yang relevan dengan siswa ini.\n";
    }

    prompt += `
### Analisis dan Rekomendasi\nBerikan analisis dalam format berikut:
1.  **Ringkasan Performa:** Ringkasan umum performa siswa berdasarkan semua data (nilai, kehadiran, dan pelanggaran).
2.  **Poin Kuat:** Identifikasi area prestasi siswa.
3.  **Area Perlu Perhatian:** Identifikasi tantangan atau area yang memerlukan perbaikan (akademik, kehadiran, atau perilaku).
4.  **Rekomendasi Tindak Lanjut:** Berikan 3-5 langkah konkret untuk guru.`;

    try {
      const text = await generateStudentAnalysis(prompt);
      setAnalysisResult(text);
    } catch (error) {
      toast.error("Analisis AI gagal. Silakan coba lagi.");
      setAnalysisResult(error.message || "Terjadi kesalahan saat menghasilkan analisis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClassChange = (e) => {
    setSelectedClass(e.target.value);
    setStudents([]);
    setSelectedStudentId('');
    setStudentGrades([]);
    setStudentInfractions([]);
    setAnalysisResult('');
  };

  const performanceStats = useMemo(() => {
    if (studentGrades.length === 0) return { average: 0, highest: 0, lowest: 0 };
    const scores = studentGrades.map(g => parseFloat(g.score)).filter(s => !isNaN(s));
    if (scores.length === 0) return { average: 0, highest: 0, lowest: 0 };
    const total = scores.reduce((acc, score) => acc + score, 0);
    return {
      average: (total / scores.length).toFixed(2),
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
    };
  }, [studentGrades]);

  const performanceBySubject = useMemo(() => {
    if (studentGrades.length === 0) return [];
    const subjectGrades = {};
    studentGrades.forEach(grade => {
      const score = parseFloat(grade.score);
      if (isNaN(score)) return;
      if (!subjectGrades[grade.subjectName]) {
        subjectGrades[grade.subjectName] = { scores: [], count: 0 };
      }
      subjectGrades[grade.subjectName].scores.push(score);
      subjectGrades[grade.subjectName].count++;
    });
    return Object.entries(subjectGrades).map(([subjectName, data]) => ({
      subjectName,
      averageScore: parseFloat((data.scores.reduce((a, b) => a + b, 0) / data.count).toFixed(2)),
    }));
  }, [studentGrades]);

  const performanceOverTime = useMemo(() => {
    return studentGrades.map(grade => ({ date: grade.date, score: parseFloat(grade.score), material: grade.material })).filter(g => !isNaN(g.score));
  }, [studentGrades]);

  const attendanceStats = useMemo(() => {
    const stats = { Hadir: 0, Sakit: 0, Ijin: 0, Alpha: 0 };
    studentAttendance.forEach(record => { stats[record.status] = (stats[record.status] || 0) + 1; });
    const totalDays = studentAttendance.length;
    const attendancePercentage = totalDays > 0 ? ((stats.Hadir / totalDays) * 100).toFixed(1) : 0;
    return { ...stats, totalDays, attendancePercentage };
  }, [studentAttendance]);

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Analisis Performa Siswa</h1>
        <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
          <div className="flex-1">
            <StyledSelect value={selectedClass} onChange={handleClassChange}>
              <option value="">Pilih Kelas</option>
              {classes.map(cls => <option key={cls.id} value={cls.rombel}>{cls.rombel}</option>)}
            </StyledSelect>
          </div>
          <div className="flex-1">
            <StyledSelect value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} disabled={!selectedClass || isFetchingStudents}>
              <option value="">{isFetchingStudents ? 'Memuat siswa...' : 'Pilih Siswa'}</option>
              {students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
            </StyledSelect>
          </div>
        </div>
      </div>

      {isLoading && <div className="text-center py-10">Memuat data siswa...</div>}

      {!isLoading && !selectedStudentId && (
        <div className="text-center py-10 bg-white dark:bg-gray-800 shadow-md rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">Pilih kelas dan siswa untuk melihat analisis data.</p>
        </div>
      )}

      {!isLoading && selectedStudentId && (
        <div className="space-y-8">
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
            <button
              className={`py-2 px-4 text-lg font-medium ${activeTab === 'analisis' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 dark:text-gray-400 hover:text-blue-500'}`}
              onClick={() => setActiveTab('analisis')}
            >
              Analisis AI
            </button>
            <button
              className={`py-2 px-4 text-lg font-medium ${activeTab === 'data' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 dark:text-gray-400 hover:text-blue-500'}`}
              onClick={() => setActiveTab('data')}
            >
              Visualisasi Data
            </button>
          </div>

          {activeTab === 'analisis' && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Analisis & Rekomendasi AI</h2>
                <button 
                  onClick={handleAiAnalysis} 
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 transition-all duration-200"
                >
                  <BrainCircuit size={20} />
                  {isAnalyzing ? 'Menganalisis...' : 'Jalankan Analisis'}
                </button>
              </div>
              {isAnalyzing && <div className="text-center py-10">AI sedang menganalisis data, mohon tunggu...</div>}
              {analysisResult && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{analysisResult}</ReactMarkdown>
                </div>
              )}
              {!analysisResult && !isAnalyzing && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-10">Klik tombol "Jalankan Analisis" untuk mendapatkan wawasan mendalam tentang performa siswa.</p>
              )}
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"><h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Nilai Rata-rata</h3><p className="text-4xl font-bold text-blue-500">{performanceStats.average}</p></div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"><h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Nilai Tertinggi</h3><p className="text-4xl font-bold text-green-500">{performanceStats.highest}</p></div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"><h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Nilai Terendah</h3><p className="text-4xl font-bold text-red-500">{performanceStats.lowest}</p></div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl"><h3 className="text-xl font-semibold mb-6 text-gray-700 dark:text-gray-200">Rata-rata per Mata Pelajaran</h3><ResponsiveContainer width="100%" height={300}><BarChart data={performanceBySubject}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="subjectName" /><YAxis domain={[0, 100]} /><Tooltip /><Legend /><Bar dataKey="averageScore" fill="#8884d8" name="Nilai Rata-rata" /></BarChart></ResponsiveContainer></div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl"><h3 className="text-xl font-semibold mb-6 text-gray-700 dark:text-gray-200">Distribusi Kehadiran</h3><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={[{ name: 'Hadir', value: attendanceStats.Hadir }, { name: 'Sakit', value: attendanceStats.Sakit }, { name: 'Ijin', value: attendanceStats.Ijin }, { name: 'Alpha', value: attendanceStats.Alpha }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>{[{ name: 'Hadir', value: attendanceStats.Hadir }, { name: 'Sakit', value: attendanceStats.Sakit }, { name: 'Ijin', value: attendanceStats.Ijin }, { name: 'Alpha', value: attendanceStats.Alpha }].map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalisisSiswaPage;