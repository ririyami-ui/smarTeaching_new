import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { generateRombelAnalysis } from '../utils/gemini'; // Import the centralized function

const COLORS = ['#0088FE', '#FFBB28', '#FF8042', '#00C49F']; // Blue, Yellow, Orange, Green

export default function AnalisisRombelPage() {
  const { rombel } = useParams();
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [gradeData, setGradeData] = useState([]);
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser || !rombel) return;
      setLoading(true);

      try {
        // 1. Fetch students in the rombel
        const studentsQuery = query(
          collection(db, 'students'),
          where('userId', '==', auth.currentUser.uid),
          where('rombel', '==', rombel)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        const fetchedStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStudents(fetchedStudents);

        if (fetchedStudents.length === 0) {
          setLoading(false);
          return;
        }

        const studentIds = fetchedStudents.map(s => s.id);

        // 2. Fetch and process attendance
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('userId', '==', auth.currentUser.uid),
          where('studentId', 'in', studentIds)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceRecords = attendanceSnapshot.docs.map(doc => doc.data());
        
        const overallAttendanceCounts = attendanceRecords.reduce((acc, record) => {
          acc[record.status] = (acc[record.status] || 0) + 1;
          return acc;
        }, {});
        const attendanceChartData = Object.keys(overallAttendanceCounts).map(status => ({
          name: status,
          value: overallAttendanceCounts[status],
        }));
        setAttendanceData(attendanceChartData);

        // 3. Fetch and process grades (FIXED QUERY)
        const gradesQuery = query(
          collection(db, 'grades'),
          where('userId', '==', auth.currentUser.uid),
          where('className', '==', rombel)
        );
        const gradesSnapshot = await getDocs(gradesQuery);
        const gradeRecords = gradesSnapshot.docs.map(doc => doc.data());

        const gradeDistribution = gradeRecords.reduce((acc, record) => {
            const score = Math.floor(record.score / 10) * 10;
            const range = `${score}-${score + 9}`;
            acc[range] = (acc[range] || 0) + 1;
            return acc;
        }, {});
        const gradeChartData = Object.keys(gradeDistribution).sort().map(range => ({
            name: range,
            'Jumlah Siswa': gradeDistribution[range],
        }));
        setGradeData(gradeChartData);

        // 4. Prepare data for AI prompt (per student)
        const studentDataForPrompt = fetchedStudents.map(student => {
          const studentGrades = gradeRecords.filter(g => g.studentId === student.id);
          const studentAttendance = attendanceRecords.filter(a => a.studentId === student.id);
          
          const avgScore = studentGrades.length > 0 
            ? studentGrades.reduce((sum, g) => sum + parseFloat(g.score), 0) / studentGrades.length
            : null;

          const attendanceSummary = studentAttendance.reduce((acc, a) => {
            acc[a.status] = (acc[a.status] || 0) + 1;
            return acc;
          }, {});

          return {
            name: student.name,
            averageScore: avgScore ? avgScore.toFixed(2) : 'N/A',
            attendance: attendanceSummary
          };
        });

        // 5. Generate AI Recommendation using the centralized function
        setLoadingRecommendation(true);
        try {
          const aiResponse = await generateRombelAnalysis(studentDataForPrompt, rombel);
          setRecommendation(aiResponse);
        } catch (aiError) {
          console.error("Error generating AI recommendation:", aiError);
          setRecommendation("Gagal menghasilkan rekomendasi. Silakan coba lagi nanti.");
        }
        setLoadingRecommendation(false);

      } catch (error) {
        console.error("Error fetching rombel analysis data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [rombel]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-primary-dark dark:text-primary-light">Analisis Rombel: {rombel}</h1>
      
      {students.length === 0 ? (
        <p>Tidak ada data siswa untuk rombel ini.</p>
      ) : (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-semibold text-text-light dark:text-text-dark mb-4">Grafik Kehadiran</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={attendanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                      {attendanceData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-semibold text-text-light dark:text-text-dark mb-4">Distribusi Nilai</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Jumlah Siswa" fill="#8884d8" />
                    </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AI Recommendation */}
          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-semibold text-primary-dark dark:text-primary-light mb-4">Siswa Perlu Perhatian Khusus (Analisis AI)</h2>
            {loadingRecommendation ? (
              <p>Menganalisis data dan membuat rekomendasi...</p>
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>{recommendation}</ReactMarkdown>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}