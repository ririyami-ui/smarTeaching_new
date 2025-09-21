import React, { useState, useEffect } from 'react';
import { doc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Loader, FileText, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateClassAnalysisReport, generateConciseClassAnalysisReport } from '../utils/gemini';

const AnalisisKelasPage = () => {
  const [userClasses, setUserClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [isConcise, setIsConcise] = useState(true); // State for report type

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

  const handleGenerateReport = async () => {
    if (!selectedClass) return;
    setLoading(true);
    setReport('');

    try {
      const classInfo = userClasses.find(c => c.id === selectedClass);

      // 1. Fetch students in the class
      const studentsQuery = query(collection(db, 'students'), where('userId', '==', auth.currentUser.uid), where('rombel', '==', classInfo.rombel));
      const studentsSnapshot = await getDocs(studentsQuery);
      const students = studentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const studentIdToNameMap = students.reduce((acc, student) => {
        acc[student.id] = student.name;
        return acc;
      }, {});

      // 2. Fetch grades for the students in this class (SORTED)
      const gradesQuery = query(collection(db, 'grades'), where('userId', '==', auth.currentUser.uid), where('classId', '==', selectedClass), orderBy('date', 'asc'));
      const gradesSnapshot = await getDocs(gradesQuery);
      const grades = gradesSnapshot.docs.map(d => {
        const grade = d.data();
        const newGrade = { ...grade, studentName: studentIdToNameMap[grade.studentId] || 'Nama tidak ditemukan' };
        delete newGrade.studentId; // Explicitly remove studentId
        return newGrade;
      });

      // 3. Fetch attendance for this class (SORTED)
      const attendanceQuery = query(collection(db, 'attendance'), where('userId', '==', auth.currentUser.uid), where('rombel', '==', classInfo.rombel), orderBy('date', 'asc'));
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendance = attendanceSnapshot.docs.map(d => {
        const att = d.data();
        const newAtt = { ...att, studentName: studentIdToNameMap[att.studentId] || 'Nama tidak ditemukan' };
        delete newAtt.studentId; // Explicitly remove studentId
        return newAtt;
      });

      // 4. Fetch violations for this class (SORTED)
      const violationsQuery = query(collection(db, 'infractions'), where('userId', '==', auth.currentUser.uid), where('classId', '==', classInfo.rombel), orderBy('date', 'asc'));
      const violationsSnapshot = await getDocs(violationsQuery);
      const infractions = violationsSnapshot.docs.map(d => {
        const infraction = d.data();
        const newInfraction = { ...infraction, studentName: studentIdToNameMap[infraction.studentId] || 'Nama tidak ditemukan' };
        delete newInfraction.studentId; // Explicitly remove studentId
        return newInfraction;
      });

      // 5. Fetch journals for this class (FIXED & SORTED)
      const journalsQuery = query(collection(db, 'teachingJournals'), where('userId', '==', auth.currentUser.uid), where('classId', '==', selectedClass), orderBy('date', 'asc'));
      const journalsSnapshot = await getDocs(journalsQuery);
      const journals = journalsSnapshot.docs.map(d => d.data());

      const classData = {
        className: classInfo.name,
        students: students.map(s => ({ name: s.name })), // Only include student names
        grades,
        attendance,
        infractions,
        journals
      };

      let generatedReport;
      if (isConcise) {
        generatedReport = await generateConciseClassAnalysisReport(classData);
      } else {
        generatedReport = await generateClassAnalysisReport(classData);
      }
      setReport(generatedReport);

    } catch (error) {
      console.error("Error generating report: ", error);
      setReport("Gagal membuat laporan. Silakan coba lagi. Pastikan semua index Firestore yang diperlukan sudah dibuat.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Laporan Analisis Kelas</h1>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Pilih Opsi Laporan</h2>
        {loadingClasses ? (
          <Loader className="animate-spin" />
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <select 
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full max-w-xs p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">-- Pilih Kelas --</option>
              {userClasses.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>

            <div className="flex items-center gap-4">
                <label className="flex items-center cursor-pointer">
                    <input type="checkbox" checked={isConcise} onChange={() => setIsConcise(!isConcise)} className="sr-only peer" />
                    <div className="relative w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">Laporan Ringkas</span>
                </label>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={!selectedClass || loading}
              className="p-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center justify-center transition-colors"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 mr-2" />} 
              {loading ? 'Membuat Laporan...' : 'Buat Laporan'}
            </button>
          </div>
        )}
      </div>

      {report && !loading && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Hasil Analisis</h2>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>{report}</ReactMarkdown>
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