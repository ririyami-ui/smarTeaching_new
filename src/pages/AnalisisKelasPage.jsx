import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Loader, FileText, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateClassAnalysisReport, generateConciseClassAnalysisReport } from '../utils/gemini';
import { useSettings } from '../utils/SettingsContext';
import { generateDataHash } from '../utils/cacheUtils';
import html2canvas from 'html2canvas';
import BarChart from '../components/BarChart';
import PieChart from '../components/PieChart';
import SummaryCard from '../components/SummaryCard';
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  ShieldAlert,
  TrendingUp,
  Award,
  Brain
} from 'lucide-react';

const AnalisisKelasPage = () => {
  const { rombel } = useParams(); // Get rombel from URL
  const navigate = useNavigate();
  const [userClasses, setUserClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [isConcise, setIsConcise] = useState(true); // State for report type
  const [analysisData, setAnalysisData] = useState(null); // Store data for PDF
  const { activeSemester, academicYear, geminiModel, userProfile } = useSettings();

  useEffect(() => {
    const fetchClasses = async () => {
      if (auth.currentUser) {
        const classesCollectionRef = collection(db, 'classes');
        const q = query(classesCollectionRef, where('userId', '==', auth.currentUser.uid), orderBy('rombel', 'asc'));
        try {
          const querySnapshot = await getDocs(q);
          const classes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), name: doc.data().rombel }));
          setUserClasses(classes);
        } catch (error) {
          console.error("Error fetching classes: ", error);
        }
      }
      setLoadingClasses(false);
    };
    fetchClasses();
  }, []);

  // Effect to handle URL param 'rombel'
  useEffect(() => {
    if (rombel && userClasses.length > 0) {
      const targetClass = userClasses.find(c => c.name === rombel);
      if (targetClass) {
        setSelectedClass(targetClass.id);
        // We can't directly call handleGenerateReport here easily due to closure/async 
        // without a ref or separate effect. 
        // Better pattern: Set a "shouldGenerate" flag or just rely on manual trigger for now?
        // User requirement implies "dashboard click -> analysis". It should probably auto-load.
      } else {
        // Class not found? Maybe redirect or just do nothing
        console.warn(`Class ${rombel} not found in user's classes.`);
      }
    }
  }, [rombel, userClasses]);

  // Effect to auto-generate report when selectedClass changes IF it came from URL (optional, or just auto-generate always?)
  // Let's use a ref to track if we need to auto-run once
  const hasAutoRun = useRef(false);

  const generateReportForClass = async (classId) => {
    if (!classId) return;
    setLoading(true);
    setReport('');
    setAnalysisData(null); // Reset prior data

    try {
      const classInfo = userClasses.find(c => c.id === classId);
      // ... rest of logic
      // But wait, the original logic uses state 'selectedClass'.
      // Refactoring to take an argument is safer.
      // I will refactor handleGenerateReport to accept an optional ID, defaulting to state.

      // 1. Fetch students in the class
      const studentsQuery = query(
        collection(db, 'students'),
        where('userId', '==', auth.currentUser.uid),
        where('classId', '==', classId)
      );
      let studentsSnapshot = await getDocs(studentsQuery);

      // Fallback for legacy students
      if (studentsSnapshot.empty) {
        const fallbackStudentsQuery = query(
          collection(db, 'students'),
          where('userId', '==', auth.currentUser.uid),
          where('rombel', '==', classInfo.rombel)
        );
        studentsSnapshot = await getDocs(fallbackStudentsQuery);
      }
      const students = studentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const studentIdToNameMap = students.reduce((acc, student) => {
        acc[student.id] = student.name;
        return acc;
      }, {});

      // 2. Fetch grades for the students in this class (SORTED)
      const gradesQuery = query(
        collection(db, 'grades'),
        where('userId', '==', auth.currentUser.uid),
        where('classId', '==', classId),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear),
        orderBy('date', 'asc')
      );
      const gradesSnapshot = await getDocs(gradesQuery);
      const grades = gradesSnapshot.docs.map(d => {
        const grade = d.data();
        const newGrade = { ...grade, studentName: studentIdToNameMap[grade.studentId] || 'Nama tidak ditemukan' };
        delete newGrade.studentId; // Explicitly remove studentId
        return newGrade;
      });

      // 3. Fetch attendance for this class (SORTED)
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('userId', '==', auth.currentUser.uid),
        where('classId', '==', classId),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear),
        orderBy('date', 'asc')
      );
      let attendanceSnapshot = await getDocs(attendanceQuery);

      // Fallback for legacy attendance
      if (attendanceSnapshot.empty) {
        const fallbackAttendanceQuery = query(
          collection(db, 'attendance'),
          where('userId', '==', auth.currentUser.uid),
          where('rombel', '==', classInfo.rombel),
          where('semester', '==', activeSemester),
          where('academicYear', '==', academicYear),
          orderBy('date', 'asc')
        );
        attendanceSnapshot = await getDocs(fallbackAttendanceQuery);
      }
      const attendance = attendanceSnapshot.docs.map(d => {
        const att = d.data();
        const newAtt = { ...att, studentName: studentIdToNameMap[att.studentId] || 'Nama tidak ditemukan' };
        delete newAtt.studentId; // Explicitly remove studentId
        return newAtt;
      });

      // 4. Fetch violations for this class (SORTED)
      const violationsQuery = query(
        collection(db, 'infractions'),
        where('userId', '==', auth.currentUser.uid),
        where('classId', '==', classId),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear),
        orderBy('date', 'asc')
      );
      let violationsSnapshot = await getDocs(violationsQuery);

      // Fallback for legacy violations (if classId used to be rombel)
      if (violationsSnapshot.empty) {
        const fallbackViolationsQuery = query(
          collection(db, 'infractions'),
          where('userId', '==', auth.currentUser.uid),
          where('classId', '==', classInfo.rombel),
          where('semester', '==', activeSemester),
          where('academicYear', '==', academicYear),
          orderBy('date', 'asc')
        );
        violationsSnapshot = await getDocs(fallbackViolationsQuery);
      }
      const infractions = violationsSnapshot.docs.map(d => {
        const infraction = d.data();
        const newInfraction = { ...infraction, studentName: studentIdToNameMap[infraction.studentId] || 'Nama tidak ditemukan' };
        delete newInfraction.studentId; // Explicitly remove studentId
        return newInfraction;
      });

      // 5. Fetch journals for this class (FIXED & SORTED)
      const journalsQuery = query(
        collection(db, 'teachingJournals'),
        where('userId', '==', auth.currentUser.uid),
        where('classId', '==', classId),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear),
        orderBy('date', 'asc')
      );
      const journalsSnapshot = await getDocs(journalsQuery);
      const journals = journalsSnapshot.docs.map(d => d.data());

      // VALIDATION: If NO data at all, we don't do analysis
      if (grades.length === 0 && attendance.length === 0 && infractions.length === 0 && journals.length === 0) {
        setReport("⚠️ **Data Analisis Kosong.** Tidak ada data (Nilai, Absensi, Pelanggaran, atau Jurnal) yang ditemukan untuk kelas dan periode ini. Silakan input data terlebih dahulu.");
        setLoading(false);
        return;
      }

      const classData = {
        className: classInfo.name,
        students: students.map(s => ({ name: s.name })), // Only include student names
        grades,
        attendance,
        infractions,
        journals
      };

      // Calculate Classroom Stats for Infographic
      const stats = {
        academic: {
          avg: 0,
          highest: 0,
          lowest: 0,
          chart: []
        },
        attendance: {
          Hadir: 0,
          Sakit: 0,
          Ijin: 0,
          Alpha: 0,
          pct: 0,
          schoolDays: 0,
          studentCount: 0
        },
        infractions: {
          total: infractions.length,
          totalPoints: infractions.reduce((acc, curr) => acc + (curr.points || 0), 0)
        }
      };

      // 1. Process Grades
      if (grades.length > 0) {
        const scores = grades.map(g => parseFloat(g.score)).filter(s => !isNaN(s));
        if (scores.length > 0) {
          stats.academic.avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
          stats.academic.highest = Math.max(...scores);
          stats.academic.lowest = Math.min(...scores);

          // Subject grouping for BarChart
          const subjectMap = {};
          grades.forEach(g => {
            if (!subjectMap[g.subjectName]) subjectMap[g.subjectName] = { t: 0, c: 0 };
            subjectMap[g.subjectName].t += parseFloat(g.score);
            subjectMap[g.subjectName].c++;
          });
          stats.academic.chart = Object.entries(subjectMap).map(([label, d]) => ({
            label,
            value: parseFloat((d.t / d.c).toFixed(1)),
            color: 'blue'
          }));
        }
      }

      // 2. Process Attendance
      if (attendance.length > 0) {
        attendance.forEach(a => {
          if (stats.attendance.hasOwnProperty(a.status)) stats.attendance[a.status]++;
        });
        stats.attendance.pct = ((stats.attendance.Hadir / attendance.length) * 100).toFixed(1);

        // Calculate active school days (unique dates in records)
        const uniqueDates = new Set(attendance.map(a => a.date));
        stats.attendance.schoolDays = uniqueDates.size;
        stats.attendance.studentCount = students.length;
      }

      setAnalysisData({ ...classData, stats }); // Save for PDF & UI

      // Check cache
      const dataHash = generateDataHash({ ...classData, isConcise, geminiModel, activeSemester, academicYear });
      const cacheKey = `class-analysis-${classId}-${dataHash}`;
      const cachedReport = localStorage.getItem(cacheKey);

      if (cachedReport) {
        console.log("Using cached class analysis for:", classId);
        setReport(cachedReport);
        setLoading(false);
        return;
      }

      let generatedReport;
      if (isConcise) {
        generatedReport = await generateConciseClassAnalysisReport(classData, geminiModel);
      } else {
        generatedReport = await generateClassAnalysisReport(classData, geminiModel);
      }
      setReport(generatedReport);
      localStorage.setItem(cacheKey, generatedReport);

    } catch (error) {
      console.error("Error generating report: ", error);
      setReport("Gagal membuat laporan. Silakan coba lagi. Pastikan semua index Firestore yang diperlukan sudah dibuat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Trigger generation if class is selected via URL and hasn't run yet
    if (selectedClass && rombel && !hasAutoRun.current && userClasses.length > 0) {
      hasAutoRun.current = true;
      generateReportForClass(selectedClass);
    }
  }, [selectedClass, rombel, userClasses]);

  const handleGenerateReport = () => {
    generateReportForClass(selectedClass);
  };

  return (
    <div className="p-3 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 dark:text-white">Laporan Analisis Kelas</h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Pilih Opsi Laporan</h2>
        {loadingClasses ? (
          <Loader className="animate-spin" />
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">-- Pilih Kelas --</option>
              {userClasses.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>

            <div className="flex items-center gap-4 bg-gray-100 dark:bg-gray-700/50 p-2 px-4 rounded-lg">
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" checked={isConcise} onChange={() => setIsConcise(!isConcise)} className="sr-only peer" />
                <div className="relative w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300 whitespace-nowrap">Laporan Ringkas</span>
              </label>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={!selectedClass || loading}
              className="p-3 px-6 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center justify-center transition-colors shadow-md active:scale-95"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 mr-2" />}
              {loading ? 'Membuat Laporan...' : 'Buat Laporan'}
            </button>
          </div>
        )}
      </div>

      {report && !loading && analysisData && (
        <div className="space-y-8 animate-fade-in-up">
          {/* Header Result */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600">
                <TrendingUp size={24} />
              </div>
              <span>Analisis Kelas: {analysisData.className}</span>
            </h2>
            <button
              onClick={async () => {
                const infographicElement = document.getElementById('class-analysis-infographic');
                if (!infographicElement) return;

                const originalStyle = infographicElement.style.cssText;
                // Optimize for capture - ensure no rounding issues
                infographicElement.style.borderRadius = '0';

                const canvas = await html2canvas(infographicElement, {
                  scale: 2,
                  useCORS: true,
                  backgroundColor: null // Transparent/use element background
                });

                infographicElement.style.cssText = originalStyle;

                const imgData = canvas.toDataURL('image/png');

                import('../utils/pdfGenerator').then(({ generateClassAnalysisPDF }) => {
                  const teacherName = auth.currentUser.displayName || 'Guru';
                  const profileData = userProfile || { school: 'Nama Sekolah Belum Diatur' };
                  generateClassAnalysisPDF(analysisData, report, teacherName, profileData, imgData);
                });
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 text-sm sm:text-base"
            >
              <FileText size={20} /> Download PDF
            </button>
          </div>

          {/* Container for PDF Capture */}
          <div id="class-analysis-infographic" className="space-y-6 p-4 bg-white">
            {/* Row 1: Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                title="Rata-rata Kelas"
                value={analysisData.stats?.academic.avg || 0}
                icon={<Award className="text-yellow-600" size={24} />}
                color="bg-yellow-100"
                subtitle={`${analysisData.stats?.academic.lowest} - ${analysisData.stats?.academic.highest} (Rentang)`}
              />
              <SummaryCard
                title="Presensi Hadir"
                value={`${analysisData.stats?.attendance.pct || 0}%`}
                icon={<ClipboardCheck className="text-green-600" size={24} />}
                color="bg-green-100"
                subtitle="Persentase Kehadiran"
              />
              <SummaryCard
                title="Total Pelanggaran"
                value={analysisData.stats?.infractions.total || 0}
                icon={<ShieldAlert className="text-red-600" size={24} />}
                color="bg-red-100"
                subtitle={`Poin Minus: ${analysisData.stats?.infractions.totalPoints}`}
              />
              <SummaryCard
                title="Populasi"
                value={analysisData.students.length}
                icon={<Users className="text-blue-600" size={24} />}
                color="bg-blue-100"
                subtitle="Peserta Didik Aktif"
              />
            </div>

            {/* Row 2: Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Academic Chart */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 uppercase tracking-wider">Performa per Mata Pelajaran</h3>
                <div className="h-[300px]">
                  <BarChart data={analysisData.stats?.academic.chart || []} />
                </div>
              </div>

              {/* Attendance Chart */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 uppercase tracking-wider">Komposisi Kehadiran</h3>
                <div className="h-[300px]">
                  <PieChart data={analysisData.stats?.attendance || {}} />
                </div>
              </div>
            </div>

            {/* Footer Badge inside Image - kept minimal */}
            <div className="flex justify-center items-center gap-2 opacity-60 pt-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Generated by Smart Teaching AI</span>
            </div>
          </div>

          {/* Row 3: AI Recommendations */}
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden border border-blue-100 dark:border-blue-900/30">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 sm:p-6 text-white flex items-center gap-4">
              <div className="p-2 sm:p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                <Brain size={24} className="animate-pulse sm:w-7 sm:h-7" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest leading-tight">Rekomendasi AI</h3>
                <p className="text-xs sm:text-sm opacity-80">Analisis cerdas berdasarkan data riil</p>
              </div>
            </div>
            <div className="p-4 sm:p-8">
              <div className="prose dark:prose-invert max-w-none prose-sm md:prose-base prose-p:leading-relaxed prose-li:my-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center mt-10">
          <Loader className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="ml-3 text-gray-500">Menganalisis data kelas dan membuat laporan, ini mungkin memakan waktu sejenak...</p>
        </div>
      )}
    </div>
  );
};

export default AnalisisKelasPage;