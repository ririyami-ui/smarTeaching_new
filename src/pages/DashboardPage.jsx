import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Clock, BookOpen, Users, Target, ClipboardList } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import moment from 'moment';
import 'moment/locale/id';
import TeachingScheduleCard from '../components/TeachingScheduleCard'; // Import the new component
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Capacitor } from '@capacitor/core';

// Helper function to get the next occurrence of a day of the week
const getNextDayOccurrence = (dayOfWeek, timeString, startDate = moment()) => {
  const daysMap = {
    'Minggu': 0,
    'Senin': 1,
    'Selasa': 2,
    'Rabu': 3,
    'Kamis': 4,
    'Jumat': 5,
    'Sabtu': 6,
  };
  const targetDay = daysMap[dayOfWeek];
  let currentMoment = moment(startDate);
  let dayDiff = targetDay - currentMoment.day();
  if (dayDiff < 0) {
    dayDiff += 7; // Move to next week if the day has already passed this week
  }
  currentMoment.add(dayDiff, 'days');
  
  // Set the time
  const [hours, minutes] = timeString.split(':').map(Number);
  currentMoment.hour(hours).minute(minutes).second(0).millisecond(0);
  
  return currentMoment.toDate();
};

// Digital Clock Component
const DigitalClock = () => {
  const [currentTime, setCurrentTime] = useState(moment());

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(moment()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const dayMap = {
    'Sunday': 'Minggu',
    'Monday': 'Senin',
    'Tuesday': 'Selasa',
    'Wednesday': 'Rabu',
    'Thursday': 'Kamis',
    'Friday': 'Jumat',
    'Saturday': 'Sabtu',
  };

  const monthMap = {
    'January': 'Januari',
    'February': 'Februari',
    'March': 'Maret',
    'April': 'April',
    'May': 'Mei',
    'June': 'Juni',
    'July': 'Juli',
    'August': 'Agustus',
    'September': 'September',
    'October': 'Oktober',
    'November': 'November',
    'December': 'Desember',
  };

  let formattedDate = currentTime.format('dddd, DD MMMM YYYY');
  for (const [englishDay, indonesianDay] of Object.entries(dayMap)) {
    formattedDate = formattedDate.replace(englishDay, indonesianDay);
  }
  for (const [englishMonth, indonesianMonth] of Object.entries(monthMap)) {
    formattedDate = formattedDate.replace(englishMonth, indonesianMonth);
  }

  return (
    <div className="text-center">
      <p className="text-5xl font-bold text-white transition-opacity duration-500 ease-in-out">
        {currentTime.format('HH:mm:ss')}
      </p>
      <p className="text-lg text-white mt-2">
        {formattedDate}
      </p>
    </div>
  );
};




const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-lg flex items-center gap-6">
    <div className={`p-4 rounded-full ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold text-text-light dark:text-text-dark">{value}</p>
    </div>
  </div>
);

const COLORS = ['#0088FE', '#FFBB28', '#FF8042', '#00C49F']; // Blue, Yellow, Orange, Green

export default function DashboardPage() {
  const [teachingSchedules, setTeachingSchedules] = useState([]);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [studentStats, setStudentStats] = useState({
    totalStudents: 0,
    maleStudents: 0,
    femaleStudents: 0,
    studentsByRombel: {},
  });
  const [currentTime, setCurrentTime] = useState(moment()); // Add currentTime state
  const [attendanceChartData, setAttendanceChartData] = useState([]);
  const [gradeChartData, setGradeChartData] = useState([]);

  // Update currentTime every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(moment());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchTeachingSchedules = async () => {
      if (auth.currentUser) {
        const q = query(
          collection(db, 'teachingSchedules'),
          where('userId', '==', auth.currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const fetchedSchedules = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Ensure 'class' is always a string (rombel)
          const className = typeof data.class === 'object' && data.class !== null
            ? data.class.rombel
            : data.class;
          return { id: doc.id, ...data, class: className };
        });
        setTeachingSchedules(fetchedSchedules);

        // Filter and sort today's schedules
        const today = moment();
        const todayDayName = today.format('dddd'); // e.g., "Monday"
        const dayMap = {
          'Sunday': 'Minggu',
          'Monday': 'Senin',
          'Tuesday': 'Selasa',
          'Wednesday': 'Rabu',
          'Thursday': 'Kamis',
          'Friday': 'Jumat',
          'Saturday': 'Sabtu',
        };
        const currentDayIndonesian = dayMap[todayDayName];

        const filteredTodaySchedules = fetchedSchedules.filter(
          schedule => schedule.day === currentDayIndonesian
        ).sort((a, b) => {
          const timeA = moment(a.startTime, 'HH:mm');
          const timeB = moment(b.startTime, 'HH:mm');
          return timeA.diff(timeB);
        });
        setTodaySchedules(filteredTodaySchedules);

        // --- Notifikasi Lokal ---
        const { LocalNotifications } = await import('@capacitor/local-notifications');

        // Minta izin notifikasi
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display === 'granted') {
          // Hapus notifikasi yang tertunda sebelumnya untuk menghindari duplikasi
          await LocalNotifications.cancel({ notifications: filteredTodaySchedules.map(s => ({ id: parseInt(s.id.replace(/\D/g, ''), 10) })) });

          const notificationsToSchedule = [];
          filteredTodaySchedules.forEach(schedule => {
            // Use getNextDayOccurrence to ensure the notification is scheduled for a future time
            const nextOccurrence = getNextDayOccurrence(schedule.day, schedule.startTime);
            const fiveMinutesBefore = moment(nextOccurrence).subtract(5, 'minutes');

            // Only schedule if the calculated notification time is in the future
            if (fiveMinutesBefore.isAfter(moment())) {
              const notificationId = parseInt(schedule.id.replace(/\D/g, ''), 10);
              notificationsToSchedule.push({
                id: notificationId, // Pastikan ID unik dan numerik
                title: 'Pengingat Pembelajaran',
                body: `Pembelajaran ${schedule.subject} akan dimulai dalam 5 menit pada pukul ${schedule.startTime}.`,
                schedule: { at: fiveMinutesBefore.toDate() },
                sound: null, // Gunakan suara default sistem
                attachments: null,
                actionTypeId: '',
                extra: null
              });
            }
          });

          if (notificationsToSchedule.length > 0) {
            await LocalNotifications.schedule({ notifications: notificationsToSchedule });
          }
        }
        // --- Akhir Notifikasi Lokal ---
        

      } else {
        // Handle case where user is not authenticated (e.g., set schedules to empty array)
        setTeachingSchedules([]);
        setTodaySchedules([]);
      }
    };

    // Listen for auth state changes to refetch schedules
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchTeachingSchedules();
      } else {
        setTeachingSchedules([]);
        setTodaySchedules([]);
      }
    });

    // Initial fetch
    fetchTeachingSchedules();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchStudentStats = async () => {
      try {
        if (!auth.currentUser) { // Check if user is authenticated
          setStudentStats({
            totalStudents: 0,
            maleStudents: 0,
            femaleStudents: 0,
            studentsByRombel: {},
          });
          return;
        }

        const userId = auth.currentUser.uid; // Get current user's UID
        const studentsCollectionRef = collection(db, 'students');
        const q = query(studentsCollectionRef, where('userId', '==', userId)); // Add user ID filter
        const querySnapshot = await getDocs(q);
        const fetchedStudentsRaw = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); // Get doc.id
        // De-duplicate fetchedStudents based on a unique ID (assuming 'id' field exists)
        const uniqueStudentsMap = new Map();
        fetchedStudentsRaw.forEach(student => {
          if (student.id) {
            uniqueStudentsMap.set(student.id, student);
          } else {
            // Fallback if no ID, use a combination of fields or log a warning
            console.warn("Student document missing 'id' field for de-duplication:", student);
            // For now, if no ID, just add it. This might lead to duplicates if IDs are truly missing.
            // A better approach would be to use a combination of fields like name + rombel
            uniqueStudentsMap.set(JSON.stringify(student), student);
          }
        });
        const fetchedStudents = Array.from(uniqueStudentsMap.values());
        console.log("Fetched Students (de-duplicated):", fetchedStudents);

        let totalStudents = 0;
        let maleStudents = 0;
        let femaleStudents = 0;
        const studentsByRombel = {};

        fetchedStudents.forEach(student => {
          totalStudents++;
          if (student.gender === 'Laki-laki') { // Assuming 'gender' field and 'Laki-laki' for male
            maleStudents++;
          } else if (student.gender === 'Perempuan') { // Assuming 'gender' field and 'Perempuan' for female
            femaleStudents++;
          }

          if (student.rombel) { // Assuming 'rombel' field for class
            if (!studentsByRombel[student.rombel]) {
              studentsByRombel[student.rombel] = {
                total: 0,
                male: 0,
                female: 0,
                students: [],
              };
            }
            studentsByRombel[student.rombel].total++;
            if (student.gender === 'Laki-laki') {
              studentsByRombel[student.rombel].male++;
            } else if (student.gender === 'Perempuan') {
              studentsByRombel[student.rombel].female++;
            }
            studentsByRombel[student.rombel].students.push(student);
          }
        });

        console.log("Student Stats:", {
          totalStudents,
          maleStudents,
          femaleStudents,
          studentsByRombel,
        });

        setStudentStats({
          totalStudents,
          maleStudents,
          femaleStudents,
          studentsByRombel,
        });
      } catch (error) {
        console.error("Error fetching student stats:", error);
      }
    };

    fetchStudentStats();
  }, []);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!auth.currentUser) return;

      try {
        const userId = auth.currentUser.uid;
        const attendanceCollectionRef = collection(db, 'attendance');
        const q = query(attendanceCollectionRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        const attendanceCounts = {
          'Hadir': 0,
          'Sakit': 0,
          'Ijin': 0,
          'Alpha': 0,
        };

        querySnapshot.docs.forEach(doc => {
          const status = doc.data().status;
          if (attendanceCounts.hasOwnProperty(status)) {
            attendanceCounts[status]++;
          }
        });

        const chartData = Object.keys(attendanceCounts).map(status => ({
          name: status,
          value: attendanceCounts[status],
        }));

        setAttendanceChartData(chartData);
      } catch (error) {
        console.error("Error fetching attendance data for chart:", error);
      }
    };

    fetchAttendanceData();
  }, [auth.currentUser]); // Re-run when user changes

  useEffect(() => {
    const fetchGradeData = async () => {
      if (!auth.currentUser) return;

      try {
        const userId = auth.currentUser.uid;
        const gradesCollectionRef = collection(db, 'grades');
        const q = query(gradesCollectionRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        const gradesByDate = {};

        querySnapshot.docs.forEach(doc => {
          const grade = doc.data();
          const date = moment(grade.date).format('YYYY-MM-DD');
          const score = parseFloat(grade.score);

          if (!isNaN(score)) {
            if (!gradesByDate[date]) {
              gradesByDate[date] = { totalScore: 0, count: 0 };
            }
            gradesByDate[date].totalScore += score;
            gradesByDate[date].count++;
          }
        });

        const chartData = Object.keys(gradesByDate).map(date => ({
          name: moment(date).format('DD MMM'),
          'Rata-rata Nilai': parseFloat((gradesByDate[date].totalScore / gradesByDate[date].count).toFixed(2)),
        })).sort((a, b) => new Date(a.name) - new Date(b.name));

        setGradeChartData(chartData);
      } catch (error) {
        console.error("Error fetching grade data for chart:", error);
      }
    };

    fetchGradeData();
  }, [auth.currentUser]);

  return (
    <div className="space-y-6">
      {/* Top Section: Clock and Reminder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-primary to-primary-700 p-6 rounded-3xl shadow-2xl text-white flex flex-col justify-center items-center text-center">
          <h2 className="text-xl font-semibold mb-4">Waktu Saat Ini</h2>
          <DigitalClock />
        </div>
        <TeachingScheduleCard schedules={todaySchedules} currentTime={currentTime} /> {/* Render the new component here */}
      </div>

      

      {/* Student Recap Section */}
      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-primary-dark dark:text-primary-light mb-6 text-center">Rekap Siswa</h2> {/* Enhanced title */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"> {/* Grid for total counts */}
          <div className="p-4 rounded-lg shadow-md bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800 dark:to-green-900 text-green-800 dark:text-green-200 flex flex-col items-center justify-center">
            <p className="text-sm font-medium">Total Siswa</p>
            <p className="text-3xl font-bold">{studentStats.totalStudents}</p>
          </div>
          <div className="p-4 rounded-lg shadow-md bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 text-blue-800 dark:text-blue-200 flex flex-col items-center justify-center">
            <p className="text-sm font-medium">Laki-laki</p>
            <p className="text-3xl font-bold">{studentStats.maleStudents}</p>
          </div>
          <div className="p-4 rounded-lg shadow-md bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-800 dark:to-pink-900 text-pink-800 dark:text-pink-200 flex flex-col items-center justify-center">
            <p className="text-sm font-medium">Perempuan</p>
            <p className="text-3xl font-bold">{studentStats.femaleStudents}</p>
          </div>
        </div>

          {Object.keys(studentStats.studentsByRombel).length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">Siswa per Rombel:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Added grid layout */}
                {Object.entries(studentStats.studentsByRombel).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })).map(([rombel, data]) => (
                  <Link to={`/analisis-rombel/${rombel}`} key={rombel} className="block p-4 rounded-lg shadow-md bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 text-blue-800 dark:text-blue-200 flex items-center space-x-3 hover:shadow-xl transition-shadow duration-300">
                    <Users size={24} className="flex-shrink-0" /> {/* Added icon */}
                    <div>
                      <p className="text-md font-semibold">Rombel: {rombel}</p>
                      <p className="text-sm">Total: {data.total}</p>
                      <p className="text-sm">L: {data.male} | P: {data.female}</p> {/* Condensed male/female */}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

      {/* Bottom Section: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold text-text-light dark:text-text-dark mb-4">Grafik Kehadiran Siswa</h2>
          <div className="h-64"> {/* Removed flex and justify-center as ResponsiveContainer handles sizing */}
            {attendanceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={attendanceChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {attendanceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted-light dark:text-text-muted-dark">
                Tidak ada data kehadiran untuk ditampilkan.
              </div>
            )}
          </div>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold text-text-light dark:text-text-dark mb-4">Perkembangan Nilai Rata-rata</h2>
          <div className="h-64">
            {gradeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={gradeChartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Rata-rata Nilai" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted-light dark:text-text-muted-dark">
                Tidak ada data nilai untuk ditampilkan.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};