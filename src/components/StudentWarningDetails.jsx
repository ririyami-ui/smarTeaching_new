import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Loader, AlertCircle, CheckCircle, XCircle, BookOpen, ShieldX } from 'lucide-react';

const StudentWarningDetails = ({ student }) => {
  const [details, setDetails] = useState({ grades: [], attendance: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!student || !auth.currentUser) return;

      setIsLoading(true);
      try {
        const userId = auth.currentUser.uid;

        // Fetch Grades
        const gradesQuery = query(
          collection(db, 'grades'),
          where('userId', '==', userId),
          where('studentId', '==', student.id),
          orderBy('date', 'desc')
        );
        const gradesSnapshot = await getDocs(gradesQuery);
        const grades = gradesSnapshot.docs.map(doc => ({...doc.data(), id: doc.id}));

        // Fetch Attendance
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('userId', '==', userId),
          where('studentId', '==', student.id),
          orderBy('date', 'desc')
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendance = attendanceSnapshot.docs.map(doc => ({...doc.data(), id: doc.id}));

        setDetails({ grades, attendance });
      } catch (error) {
        console.error("Error fetching student details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [student]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader className="animate-spin mr-2" />
        <span>Memuat detail...</span>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Hadir': return <CheckCircle className="text-green-500" />;
      case 'Sakit':
      case 'Ijin': return <AlertCircle className="text-yellow-500" />;
      case 'Alpha': return <XCircle className="text-red-500" />;
      default: return null;
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Detail Peringatan: {student.name}</h2>
      <p className="text-sm text-gray-500 mb-4">Kelas: {student.rombel}</p>
      
      <div className="space-y-6">
        {/* Grades Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center"><BookOpen className="mr-2"/>Nilai</h3>
          {details.grades.length > 0 ? (
            <ul className="space-y-2">
              {details.grades.map(grade => (
                <li key={grade.id} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <span>{grade.assessmentType} ({new Date(grade.date).toLocaleDateString('id-ID')})</span>
                  <span className={`font-bold ${grade.score < 65 ? 'text-red-500' : 'text-green-500'}`}>{grade.score}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-gray-500">Tidak ada data nilai.</p>}
        </div>

        {/* Infractions Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center"><ShieldX className="mr-2"/>Pelanggaran</h3>
          {student.infractions && student.infractions.length > 0 ? (
            <ul className="space-y-2">
              {student.infractions.map(infraction => (
                <li key={infraction.id} className="p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
                  <p className="font-semibold">{infraction.infractionType} <span className="font-normal text-sm">({new Date(infraction.date).toLocaleDateString('id-ID')})</span></p>
                  <p className="text-sm text-red-600 dark:text-red-400">Poin: -{infraction.points} | Sanksi: {infraction.sanction}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-gray-500">Tidak ada catatan pelanggaran.</p>}
        </div>

        {/* Attendance Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Absensi</h3>
          {details.attendance.length > 0 ? (
            <ul className="space-y-2">
              {details.attendance.map(att => (
                <li key={att.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <span>{new Date(att.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(att.status)}
                    <span>{att.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-gray-500">Tidak ada data absensi.</p>}
        </div>

      </div>
    </div>
  );
};

export default StudentWarningDetails;
