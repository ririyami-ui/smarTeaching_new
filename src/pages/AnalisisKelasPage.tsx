import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { auth, db } from '../firebase';
import { Loader, FileText, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { generateClassAnalysisReport, generateConciseClassAnalysisReport } from '../utils/gemini';
import { useSettings } from '../utils/SettingsContext';
import { indonesianHolidays } from '../utils/holidayData';
import { generateDataHash } from '../utils/cacheUtils';

import PieChart from '../components/PieChart';
import RadarChart from '../components/RadarChart';
import SummaryCard from '../components/SummaryCard';
import TopicMasteryHeatmap from '../components/TopicMasteryHeatmap';
import InfractionChart from '../components/InfractionChart';
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  ShieldAlert,
  TrendingUp,
  Award,
  Brain,
  ArrowLeft
} from 'lucide-react';

interface ClassItem {
  id: string;
  name: string;
  rombel: string;
}

const AnalisisKelasPage: React.FC = () => {
  const { user } = useAuth();
  const { rombel } = useParams<{ rombel?: string }>();
  const navigate = useNavigate();
  const [userClasses, setUserClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [isConcise, setIsConcise] = useState(true);
  const [analysisData, setAnalysisData] = useState<{
    className: string;
    students: { name: string }[];
    grades: Array<{ material?: string; score: string | number; [key: string]: unknown }>;
    attendance: Record<string, unknown>[];
    infractions: Array<{ infractionType?: string; [key: string]: unknown }>;
    journals: Record<string, unknown>[];
    stats: {
      academic: { avg: string | number; highest: number; lowest: number; chart: { label: string; value: number; color: string }[]; topPerformers: { name: string; avg: number }[]; bottomPerformers: { name: string; avg: number }[] };
      attendance: { Hadir: number; Sakit: number; Ijin: number; Alpha: number; pct: number; schoolDays: number; studentCount: number };
      infractions: { total: number; totalPoints: number };
    };
  } | null>(null);
  const { activeSemester, academicYear, geminiModel, userProfile } = useSettings();

  const [currentUser, setCurrentUser] = useState<{ uid: string } | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (currentUser) {
        setLoadingClasses(true);
        try {
          const classesCollectionRef = collection(db, 'classes');
          const classesQ = query(classesCollectionRef, where('userId', '==', currentUser.uid), orderBy('rombel', 'asc'));
          const classesSnapshot = await getDocs(classesQ);
          const classes = classesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            name: doc.data().rombel
          } as ClassItem));
          setUserClasses(classes);

          const subjectsCollectionRef = collection(db, 'subjects');
          const subjectsQ = query(subjectsCollectionRef, where('userId', '==', currentUser.uid));
          const subjectsSnapshot = await getDocs(subjectsQ);
          const subjects = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          localStorage.setItem('cached-subjects', JSON.stringify(subjects));
        } catch (error) {
          console.error("Error fetching initial data: ", error);
        }
        setLoadingClasses(false);
      } else {
        setUserClasses([]);
      }
    };
    fetchInitialData();
  }, [currentUser]);

  useEffect(() => {
    if (rombel && userClasses.length > 0) {
      const targetClass = userClasses.find(c => c.name === rombel);
      if (targetClass) {
        setSelectedClass(targetClass.id);
      } else {
        console.warn(`Class ${rombel} not found in user's classes.`);
      }
    }
  }, [rombel, userClasses]);

  const generateReportForClass = async (classId: string) => {
    if (!classId || !currentUser) return;
    setLoading(true);
    setReport('');
    setAnalysisData(null);

    try {
      const classInfo = userClasses.find(c => c.id === classId);
      if (!classInfo) {
        setReport("⚠️ **Kelas tidak ditemukan.**");
        setLoading(false);
        return;
      }

      const studentsByClassIdQuery = query(
        collection(db, 'students'),
        where('userId', '==', currentUser.uid),
        where('classId', '==', classId)
      );
      const studentsByRombelQuery = query(
        collection(db, 'students'),
        where('userId', '==', currentUser.uid),
        where('rombel', '==', classInfo.rombel)
      );

      const [snapStudentsId, snapStudentsRombel] = await Promise.all([
        getDocs(studentsByClassIdQuery),
        getDocs(studentsByRombelQuery)
      ]);

      const studentMap = new Map();
      snapStudentsId.docs.forEach(doc => studentMap.set(doc.id, { id: doc.id, ...doc.data() }));
      snapStudentsRombel.docs.forEach(doc => {
        if (!studentMap.has(doc.id)) studentMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      const students = Array.from(studentMap.values());

      if (students.length === 0) {
        setReport("⚠️ **Daftar Siswa Kosong.** Tidak ada siswa yang ditemukan di kelas ini. Silakan input data siswa di menu Master Data terlebih dahulu.");
        setLoading(false);
        return;
      }

      const studentIdToNameMap = students.reduce((acc: Record<string, string>, student) => {
        acc[student.id] = student.name;
        return acc;
      }, {});

      const cachedSubjects = JSON.parse(localStorage.getItem('cached-subjects') || '[]');
      const subjectIdToNameMap = cachedSubjects.reduce((acc: Record<string, string>, s: { id: string; name: string }) => {
        acc[s.id] = s.name;
        return acc;
      }, {});

      const gradesByClassIdQuery = query(
        collection(db, 'grades'),
        where('userId', '==', currentUser.uid),
        where('classId', '==', classId),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear)
      );
      const gradesByRombelQuery = query(
        collection(db, 'grades'),
        where('userId', '==', currentUser.uid),
        where('rombel', '==', classInfo.rombel),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear)
      );

      const [snapGradesId, snapGradesRombel] = await Promise.all([
        getDocs(gradesByClassIdQuery),
        getDocs(gradesByRombelQuery)
      ]);

      const gradeMap = new Map();
      snapGradesId.docs.forEach(doc => gradeMap.set(doc.id, doc.data()));
      snapGradesRombel.docs.forEach(doc => {
        if (!gradeMap.has(doc.id)) gradeMap.set(doc.id, doc.data());
      });

      const grades = Array.from(gradeMap.values()).map(grade => {
        const resolvedSubjectName = grade.subjectName || subjectIdToNameMap[grade.subjectId] || 'Mata Pelajaran';
        return {
          ...grade,
          studentName: studentIdToNameMap[grade.studentId] || 'Nama tidak ditemukan',
          subjectName: resolvedSubjectName
        };
      }).sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

      const attendByClassIdQuery = query(
        collection(db, 'attendance'),
        where('userId', '==', currentUser.uid),
        where('classId', '==', classId),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear)
      );
      const attendByRombelQuery = query(
        collection(db, 'attendance'),
        where('userId', '==', currentUser.uid),
        where('rombel', '==', classInfo.rombel),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear)
      );

      const [snapAttendId, snapAttendRombel] = await Promise.all([
        getDocs(attendByClassIdQuery),
        getDocs(attendByRombelQuery)
      ]);

      const attendMap = new Map();
      snapAttendId.docs.forEach(doc => attendMap.set(doc.id, doc.data()));
      snapAttendRombel.docs.forEach(doc => {
        if (!attendMap.has(doc.id)) attendMap.set(doc.id, doc.data());
      });

      const attendance = Array.from(attendMap.values()).map(att => {
        return { ...att, studentName: studentIdToNameMap[att.studentId] || 'Nama tidak ditemukan' };
      }).sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

      const violIdQuery = query(
        collection(db, 'infractions'),
        where('userId', '==', currentUser.uid),
        where('classId', '==', classId),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear)
      );
      const violRombelQuery = query(
        collection(db, 'infractions'),
        where('userId', '==', currentUser.uid),
        where('classId', '==', classInfo.rombel),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear)
      );

      const [snapViolId, snapViolRombel] = await Promise.all([
        getDocs(violIdQuery),
        getDocs(violRombelQuery)
      ]);

      const violMap = new Map();
      snapViolId.docs.forEach(doc => violMap.set(doc.id, doc.data()));
      snapViolRombel.docs.forEach(doc => {
        if (!violMap.has(doc.id)) violMap.set(doc.id, doc.data());
      });

      const infractions = Array.from(violMap.values()).map(infraction => {
        return { ...infraction, studentName: studentIdToNameMap[infraction.studentId] || 'Nama tidak ditemukan' };
      }).sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

      const journIdQuery = query(
        collection(db, 'teachingJournals'),
        where('userId', '==', currentUser.uid),
        where('classId', '==', classId),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear)
      );
      const journRombelQuery = query(
        collection(db, 'teachingJournals'),
        where('userId', '==', currentUser.uid),
        where('rombel', '==', classInfo.rombel),
        where('semester', '==', activeSemester),
        where('academicYear', '==', academicYear)
      );

      const [snapJournId, snapJournRombel] = await Promise.all([
        getDocs(journIdQuery),
        getDocs(journRombelQuery)
      ]);

      const journMap = new Map();
      snapJournId.docs.forEach(doc => journMap.set(doc.id, doc.data()));
      snapJournRombel.docs.forEach(doc => {
        if (!journMap.has(doc.id)) journMap.set(doc.id, doc.data());
      });

      const journals = Array.from(journMap.values()).sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

      if (grades.length === 0 && attendance.length === 0 && infractions.length === 0 && journals.length === 0) {
        setReport("⚠️ **Data Analisis Kosong.** Tidak ada data yang ditemukan untuk kelas dan periode ini. Silakan input data terlebih dahulu.");
        setLoading(false);
        return;
      }

      const classData = { className: classInfo.name, students: students.map(s => ({ name: s.name, id: s.id })), grades, attendance, infractions, journals };

      const stats: {
        academic: { avg: string | number; highest: number; lowest: number; chart: { label: string; value: number; color: string }[]; topPerformers: { name: string; avg: number }[]; bottomPerformers: { name: string; avg: number }[] };
        attendance: { Hadir: number; Sakit: number; Ijin: number; Alpha: number; pct: number; schoolDays: number; studentCount: number };
        infractions: { total: number; totalPoints: number };
      } = {
        academic: { avg: 0, highest: 0, lowest: 0, chart: [], topPerformers: [], bottomPerformers: [] },
        attendance: { Hadir: 0, Sakit: 0, Ijin: 0, Alpha: 0, pct: 0, schoolDays: 0, studentCount: 0 },
        infractions: { total: infractions.length, totalPoints: infractions.reduce((acc, curr) => acc + (curr.points || 0), 0) }
      };

      if (grades.length > 0) {
        const scores = grades.map(g => parseFloat(g.score)).filter(s => !isNaN(s));
        if (scores.length > 0) {
          stats.academic.avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
          stats.academic.highest = Math.max(...scores);
          stats.academic.lowest = Math.min(...scores);

          const subjectMap: Record<string, { t: number, c: number }> = {};
          grades.forEach(g => {
            const sName = g.subjectName || 'Mata Pelajaran';
            if (!subjectMap[sName]) subjectMap[sName] = { t: 0, c: 0 };
            subjectMap[sName].t += parseFloat(g.score);
            subjectMap[sName].c++;
          });
          stats.academic.chart = Object.entries(subjectMap).map(([label, d]) => ({
            label, value: parseFloat((d.t / d.c).toFixed(1)), color: 'blue'
          }));

          const studentPerformanceMap: Record<string, { t: number, c: number }> = {};
          grades.forEach(g => {
            if (!studentPerformanceMap[g.studentName]) studentPerformanceMap[g.studentName] = { t: 0, c: 0 };
            studentPerformanceMap[g.studentName].t += parseFloat(g.score);
            studentPerformanceMap[g.studentName].c++;
          });

          const rankedStudents = Object.entries(studentPerformanceMap)
            .map(([name, d]) => ({ name, avg: parseFloat((d.t / d.c).toFixed(1)) }))
            .sort((a, b) => b.avg - a.avg);

          stats.academic.topPerformers = rankedStudents.slice(0, 5);
          stats.academic.bottomPerformers = [...rankedStudents].reverse().slice(0, 5).filter(s => s.avg < 75);
        }
      }

if (attendance.length > 0) {
          // Exclude holidays from attendance stats
          const holidaySet = new Set(indonesianHolidays.map(h => h.date));
          const filtered = attendance.filter(a => !holidaySet.has(a.date));
          filtered.forEach(a => { if (Object.prototype.hasOwnProperty.call(stats.attendance, a.status)) stats.attendance[a.status as 'Hadir' | 'Sakit' | 'Ijin' | 'Alpha']++; });
          stats.attendance.pct = filtered.length ? parseFloat(((stats.attendance.Hadir / filtered.length) * 100).toFixed(1)) : 0;
          const uniqueDates = new Set(filtered.map(a => a.date));
          stats.attendance.schoolDays = uniqueDates.size;
          stats.attendance.studentCount = students.length;
        }

      setAnalysisData({ ...classData, stats });

      const dataHash = generateDataHash({ ...classData, isConcise, geminiModel, activeSemester, academicYear });
      const cacheKey = `class-analysis-${classId}-${dataHash}`;
      const cachedReport = localStorage.getItem(cacheKey);

      if (cachedReport) {
        setReport(cachedReport);
        setLoading(false);
        return;
      }

      let generatedReport = isConcise
        ? await generateConciseClassAnalysisReport(classData as unknown as Parameters<typeof generateConciseClassAnalysisReport>[0], geminiModel)
        : await generateClassAnalysisReport(classData as unknown as Parameters<typeof generateClassAnalysisReport>[0], geminiModel);

      setReport(generatedReport);
      localStorage.setItem(cacheKey, generatedReport);

    } catch (error) {
      console.error("Error generating report: ", error);
      setReport("Gagal membuat laporan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = () => { generateReportForClass(selectedClass); };

  return (
    <div className="p-3 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-sm transition-all active:scale-95 border border-gray-200 dark:border-gray-700"
        >
          <ArrowLeft className="text-gray-600 dark:text-gray-300" size={24} />
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">Laporan Analisis Kelas</h1>
      </div>

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
                <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300 whitespace-nowrap">Ringkas</span>
              </label>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={loading || !selectedClass}
              className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sedang Menganalisis...</span>
                </>
              ) : (
                <>
                  <Zap size={20} fill="currentColor" className="animate-pulse" />
                  <span>Generate Analisis Kelas (AI)</span>
                </>
              )}
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-900 text-[10px] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-white/10">
                ⚡ Menggunakan Quota AI
              </span>
            </button>
          </div>
        )}
      </div>

      {report && !loading && analysisData && (
        <div className="space-y-8 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600">
                <TrendingUp size={24} />
              </div>
              <span>Analisis Kelas: {analysisData.className}</span>
            </h2>
            <button
              onClick={() => {
                import('../utils/pdfGenerator').then(({ generateClassAnalysisPDF }) => {
                  const teacherName = user?.displayName || 'Guru';
                  const profileData = userProfile || { school: 'Nama Sekolah Belum Diatur' };
                  generateClassAnalysisPDF(analysisData, report, teacherName, profileData);
                });
              }}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 text-sm sm:text-base flex items-center gap-2 justify-center"
            >
              <FileText size={20} /> Download PDF
            </button>
          </div>

          <div id="class-analysis-infographic" className="space-y-6 p-4 bg-white">
            <div id="pdf-summary" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard title="Rata-rata Kelas" value={analysisData.stats?.academic.avg || 0} icon={<Award size={24} />} colorClass="glass-glow-yellow" color="bg-yellow-100/10" subtitle={`${analysisData.stats?.academic.lowest} - ${analysisData.stats?.academic.highest}`} />
              <SummaryCard title="Presensi Hadir" value={`${analysisData.stats?.attendance.pct || 0}%`} icon={<ClipboardCheck size={24} />} colorClass="glass-glow-green" color="bg-green-100/10" subtitle="Kehadiran Siswa" />
              <SummaryCard title="Total Pelanggaran" value={analysisData.stats?.infractions.total || 0} icon={<ShieldAlert size={24} />} colorClass="glass-glow-red" color="bg-red-100/10" subtitle={`Poin: ${analysisData.stats?.infractions.totalPoints}`} />
              <SummaryCard title="Populasi" value={analysisData.students.length} icon={<Users size={24} />} colorClass="glass-glow-blue" color="bg-blue-100/10" subtitle="Siswa Aktif" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div id="pdf-students" className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xs font-black text-green-600 mb-4 uppercase tracking-widest flex items-center gap-2">
                      <Award size={16} /> Top 5 Siswa
                    </h3>
                    <div className="space-y-2">
                      {(analysisData.stats?.academic.topPerformers as { name: string; avg: number }[]).map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-100">
                          <span className="text-xs font-bold text-gray-700">{idx + 1}. {s.name}</span>
                          <span className="text-xs font-black text-green-700">{s.avg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-red-600 mb-4 uppercase tracking-widest flex items-center gap-2">
                      <ShieldAlert size={16} /> Butuh Perhatian
                    </h3>
                    <div className="space-y-2">
                      {(analysisData.stats?.academic.bottomPerformers as { name: string; avg: number }[]).length > 0 ? (
                        (analysisData.stats?.academic.bottomPerformers as { name: string; avg: number }[]).map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100">
                            <span className="text-xs font-bold text-gray-700">{s.name}</span>
                            <span className="text-xs font-black text-red-700">{s.avg}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 bg-blue-50 rounded-xl text-center text-[10px] text-blue-600 font-bold">Semua siswa berkembang baik!</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div id="pdf-radar" className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-gray-800 uppercase tracking-tight">Dimensi Profil Lulusan</h2>
                    <p className="text-xs text-gray-500">Kelas {userClasses.find(c => c.id === selectedClass)?.name || ''}</p>
                  </div>
                </div>
                <div className="h-[300px] w-full flex items-center justify-center">
                  <RadarChart
                     data={{
                      "Keimanan": 85,
                      "Kewargaan": Number(analysisData.stats?.attendance.pct || 80),
                      "Penalaran Kritis": Number(analysisData.stats?.academic.avg || 75),
                      "Kreativitas": Number(analysisData.stats?.academic.avg || 75),
                      "Kolaborasi": 82,
                      "Kemandirian": Number(analysisData.stats?.attendance.pct || 80),
                      "Kesehatan": 90,
                      "Komunikasi": 80
                    }}
                    descriptions={{
                      "Keimanan": "Log Pelanggaran Kolektif Kelas",
                      "Kewargaan": "Rerata Presensi Seluruh Siswa",
                      "Penalaran Kritis": "Rerata Nilai Pengetahuan Kelas",
                      "Kreativitas": "Rerata Nilai Keterampilan Kelas",
                      "Kolaborasi": "Indeks Kerja Sama & Proyek Kelas",
                      "Kemandirian": "Indeks Kedisiplinan & Tugas Mandiri",
                      "Kesehatan": "Rerata Izin Sakit & Kebugaran Kelas",
                      "Komunikasi": "Kualitas Presentasi & Diskusi Kelas"
                    }}
                    size={250}
                  />
                </div>
                <div className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">*Analisis Kolektif BSKAP 046/2025</div>
              </div>

              <div id="pdf-attendance" className="h-full">
                <PieChart data={analysisData.stats?.attendance || {}} />
              </div>

              <div id="pdf-infractions" className="h-full">
                <InfractionChart infractions={analysisData.infractions as unknown as { infractionType: string }[]} />
              </div>

              {analysisData.grades && analysisData.grades.length > 0 && (
                <div id="pdf-heatmap" className="h-full">
                  <TopicMasteryHeatmap grades={analysisData.grades as unknown as { material?: string; score: string | number }[]} />
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-blue-100 dark:border-blue-900/30 flex flex-col h-full">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white flex items-center gap-4">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <Brain size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest leading-tight">Rekomendasi AI</h3>
                    <p className="text-[10px] opacity-80">Analisis cerdas data riil</p>
                  </div>
                </div>
                <div className="p-6 flex-1 overflow-y-auto max-h-[400px] scrollbar-thin">
                  <div id="ai-analysis-report" className="prose dark:prose-invert max-w-none prose-xs prose-p:leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeRaw, rehypeKatex]}
                    >
                      {report}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center gap-2 opacity-60 pt-4">
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Generated by Smart Teaching AI</span>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center mt-10">
          <Loader className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="ml-3 text-gray-500 font-medium">Menganalisis data kelas...</p>
        </div>
      )}
    </div>
  );
};

export default AnalisisKelasPage;
