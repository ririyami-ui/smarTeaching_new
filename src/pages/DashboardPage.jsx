import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Clock, BookOpen, Users, Target, ClipboardList, Trophy, ListTodo, AlertCircle, Calendar } from 'lucide-react';
import { collection, getDocs, query, where, doc, getDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import moment from 'moment';
import 'moment/locale/id';
import TeachingScheduleCard from '../components/TeachingScheduleCard'; // Import the new component
import HolidayWidget from '../components/HolidayWidget'; // Import HolidayWidget
import { useSettings } from '../utils/SettingsContext';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import JournalReminder from '../components/JournalReminder';
import TaskReminder from '../components/TaskReminder';
import ClockDisplay from '../components/ClockDisplay';
import MaterialCompletionChart from '../components/MaterialCompletionChart';

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

// DigitalClock local removed in favor of imported ClockDisplay







const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-6 rounded-3xl shadow-xl flex items-center gap-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/10 dark:hover:shadow-none">
    <div className={`p-4 rounded-2xl ${color} shadow-inner`}>
      {icon}
    </div>
    <div>
      <p className="text-text-muted-light dark:text-text-muted-dark text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-3xl font-black text-text-light dark:text-text-dark tracking-tight">{value}</p>
    </div>
  </div>
);

const COLORS = ['#0088FE', '#FFBB28', '#FF8042', '#00C49F']; // Blue, Yellow, Orange, Green

export default function DashboardPage() {
  const [teachingSchedules, setTeachingSchedules] = useState([]);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [todayHoliday, setTodayHoliday] = useState(null); // New State: Active Holiday Override
  const [studentStats, setStudentStats] = useState({
    totalStudents: 0,
    maleStudents: 0,
    femaleStudents: 0,
    studentsByRombel: {},
  });
  const [currentTime, setCurrentTime] = useState(moment()); // Add currentTime state
  const [attendanceChartData, setAttendanceChartData] = useState([]);
  const [gradeChartData, setGradeChartData] = useState([]);
  const [schoolName, setSchoolName] = useState("Nama Sekolah Anda"); // New state for school name
  const [topStudents, setTopStudents] = useState([]); // New state for top students
  const [programs, setPrograms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [missingJournalsCount, setMissingJournalsCount] = useState(0);
  const [carryOverMap, setCarryOverMap] = useState({}); // New state for carry-over map
  const { activeSemester, academicYear } = useSettings();
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  const [activeSchedule, setActiveSchedule] = useState(null);

  // Update currentTime every minute and detect active schedule
  useEffect(() => {
    const timer = setInterval(() => {
      const now = moment();
      setCurrentTime(now);

      // Detect active schedule
      const active = todaySchedules.find(s => {
        if (s.type === 'non-teaching') return false;
        const start = moment(s.startTime, 'HH:mm');
        const end = moment(s.endTime, 'HH:mm');
        if (end.isBefore(start)) end.add(1, 'day');
        return now.isBetween(start, end, null, '[]');
      });
      setActiveSchedule(active);
    }, 1000);
    return () => clearInterval(timer);
  }, [todaySchedules]);

  useEffect(() => {
    let unsubscribeSnapshot;

    const setupUserListener = async () => {
      if (auth.currentUser) {
        console.log("Setting up real-time listener for user:", auth.currentUser.uid);
        const userDocRef = doc(db, 'users', auth.currentUser.uid);

        unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            console.log("Real-time User Data update:", userData);
            if (userData.school) {
              setSchoolName(userData.school);
            }
            setCurrentUserProfile(userData);
          } else {
            console.log("User document does not exist");
          }
        }, (error) => {
          console.error("Error listening to user profile:", error);
        });
      }
    };

    setupUserListener();

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [auth.currentUser]);

  useEffect(() => {
    const fetchTopStudents = async () => {
      if (!auth.currentUser) return;
      try {
        const studentsSnapshot = await getDocs(query(collection(db, 'students'), where('userId', '==', auth.currentUser.uid)));
        const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const infractionsSnapshot = await getDocs(query(collection(db, 'infractions'),
          where('userId', '==', auth.currentUser.uid),
          where('semester', '==', activeSemester),
          where('academicYear', '==', academicYear)
        ));
        const infractions = infractionsSnapshot.docs.map(doc => doc.data());

        const ranked = students.map(s => {
          const score = 100 - infractions.filter(inf => inf.studentId === s.id).reduce((acc, curr) => acc + curr.points, 0);
          return { ...s, score };
        }).sort((a, b) => b.score - a.score).slice(0, 3);

        setTopStudents(ranked);
      } catch (error) {
        console.error("Error fetching top students:", error);
      }
    };
    fetchTopStudents();
  }, [auth.currentUser, activeSemester, academicYear]);

  useEffect(() => {
    const fetchHolidays = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, 'holidays'), where('userId', '==', auth.currentUser.uid));
        const snapshot = await getDocs(q);
        const holidays = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const today = moment().startOf('day');
        // Find if today is a holiday
        const activeHoliday = holidays.find(h => {
          // Case 1: Range (startDate & endDate)
          if (h.startDate && h.endDate) {
            const start = moment(h.startDate).startOf('day');
            const end = moment(h.endDate).endOf('day');
            return today.isBetween(start, end, null, '[]');
          }
          // Case 2: Single Date
          return moment(h.date).isSame(today, 'day');
        });

        if (activeHoliday) {
          setTodayHoliday(activeHoliday);
        } else {
          setTodayHoliday(null);
        }

      } catch (error) {
        console.error("Error fetching active holiday:", error);
      }
    };
    fetchHolidays();
  }, [auth.currentUser]);

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

        // Fetch "Tidak Terlaksana" journals for Carry-over alerts
        const missedJournalsQuery = query(
          collection(db, 'teachingJournals'),
          where('userId', '==', auth.currentUser.uid),
          where('isImplemented', '==', false),
          where('semester', '==', activeSemester),
          where('academicYear', '==', academicYear)
        );
        const missedJournalsSnap = await getDocs(missedJournalsQuery);
        const missedMap = {};
        missedJournalsSnap.docs.forEach(doc => {
          const data = doc.data();
          const key = `${data.className}-${data.subjectName}`;
          // Keep the latest one
          if (!missedMap[key] || moment(data.date).isAfter(missedMap[key].date)) {
            missedMap[key] = {
              material: data.material,
              date: data.date
            };
          }
        });
        setCarryOverMap(missedMap);

        // Fetch programs and classes for topic resolution
        const programsQuery = query(collection(db, 'teachingPrograms'), where('userId', '==', auth.currentUser.uid));
        const classesQuery = query(collection(db, 'classes'), where('userId', '==', auth.currentUser.uid));

        const [programsSnap, classesSnap] = await Promise.all([
          getDocs(programsQuery),
          getDocs(classesQuery)
        ]);

        setPrograms(programsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setClasses(classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));


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
  }, [auth.currentUser]);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!auth.currentUser) return;

      try {
        const userId = auth.currentUser.uid;
        const attendanceCollectionRef = collection(db, 'attendance');
        const q = query(
          attendanceCollectionRef,
          where('userId', '==', userId),
          where('semester', '==', activeSemester),
          where('academicYear', '==', academicYear)
        );
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
  }, [auth.currentUser, activeSemester, academicYear]); // Re-run when user changes

  useEffect(() => {
    const fetchGradeData = async () => {
      if (!auth.currentUser) return;

      try {
        const userId = auth.currentUser.uid;
        const gradesCollectionRef = collection(db, 'grades');
        const q = query(
          gradesCollectionRef,
          where('userId', '==', userId),
          where('semester', '==', activeSemester),
          where('academicYear', '==', academicYear)
        );
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
  }, [auth.currentUser, activeSemester, academicYear]);

  return (
    <div className="space-y-4">
      {/* Clock Display - Full width on mobile */}
      <div className="block lg:hidden">
        <ClockDisplay showProgress={true} activeSchedule={activeSchedule} />
      </div>

      {/* Top Section: Clock and Schedule - Desktop only */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ClockDisplay showProgress={true} activeSchedule={activeSchedule} />
        </div>
        <div className="lg:col-span-2">
          <TeachingScheduleCard
            schedules={todaySchedules}
            currentTime={currentTime}
            holiday={todayHoliday}
            programs={programs}
            classes={classes}
            carryOverMap={carryOverMap}
            activeSemester={activeSemester}
            academicYear={academicYear}
          />
        </div>
      </div>

      {/* Schedule Card - Mobile only */}
      <div className="block lg:hidden">
        <TeachingScheduleCard
          schedules={todaySchedules}
          currentTime={currentTime}
          holiday={todayHoliday}
          programs={programs}
          classes={classes}
          carryOverMap={carryOverMap}
          activeSemester={activeSemester}
          academicYear={academicYear}
        />
      </div>




      {/* Reminders Section */}
      <TaskReminder
        user={auth.currentUser}
        activeSemester={activeSemester}
        academicYear={academicYear}
      />

      <JournalReminder
        user={auth.currentUser}
        activeSemester={activeSemester}
        academicYear={academicYear}
        onUpdateMissingCount={setMissingJournalsCount}
      />

      {/* Middle Section: Holiday Widget & Student Recap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Holiday Widget (1/3) */}
        <div className="lg:col-span-1 h-full">
          <HolidayWidget />
        </div>

        {/* Student Recap Section (2/3) */}
        <div className="lg:col-span-2 bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-6 rounded-3xl shadow-lg">
          <h2 className="text-2xl font-black bg-gradient-to-r from-blue-900 to-indigo-900 dark:from-blue-100 dark:to-indigo-200 bg-clip-text text-transparent mb-6 tracking-tight">Rekap Siswa</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"> {/* Grid for total counts */}
            <div className="p-4 rounded-2xl border border-green-200/50 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/20 text-green-800 dark:text-green-200 flex flex-col items-center justify-center shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">Total Siswa</p>
              <p className="text-4xl font-black">{studentStats.totalStudents}</p>
            </div>
            <div className="p-4 rounded-2xl border border-blue-200/50 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 flex flex-col items-center justify-center shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">Laki-laki</p>
              <p className="text-4xl font-black">{studentStats.maleStudents}</p>
            </div>
            <div className="p-4 rounded-2xl border border-pink-200/50 dark:border-pink-800/50 bg-pink-50/50 dark:bg-pink-900/20 text-pink-800 dark:text-pink-200 flex flex-col items-center justify-center shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">Perempuan</p>
              <p className="text-4xl font-black">{studentStats.femaleStudents}</p>
            </div>
          </div>

          {Object.keys(studentStats.studentsByRombel).length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">Siswa per Rombel:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> {/* Adjusted grid layout for 2/3 width */}
                {Object.entries(studentStats.studentsByRombel).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })).map(([rombel, data]) => (
                  <Link to={`/analisis-rombel/${rombel}`} key={rombel} className="block p-4 rounded-[1.5rem] border border-blue-200/30 dark:border-blue-800/30 bg-white/40 dark:bg-black/40 backdrop-blur-sm text-blue-800 dark:text-blue-200 flex items-center space-x-4 hover:bg-blue-500 hover:text-white transition-all duration-500 group shadow-sm hover:shadow-blue-500/20 hover:scale-[1.03]">
                    <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900 group-hover:bg-white/20 transition-colors">
                      <Users size={20} className="flex-shrink-0" />
                    </div>
                    <div>
                      <p className="text-md font-black tracking-tight">{rombel}</p>
                      <p className="text-[10px] font-bold uppercase opacity-60">Total: {data.total} (L:{data.male}, P:{data.female})</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Bottom Section: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Material Completion Chart */}
        <div className="h-full">
          <MaterialCompletionChart />
        </div>

        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-6 rounded-3xl shadow-lg">
          <h2 className="text-xl font-black bg-gradient-to-r from-blue-900 to-indigo-900 dark:from-blue-100 dark:to-indigo-200 bg-clip-text text-transparent mb-6 tracking-tight">Grafik Kehadiran Siswa</h2>
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
        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-6 rounded-3xl shadow-lg">
          <h2 className="text-xl font-black bg-gradient-to-r from-blue-900 to-indigo-900 dark:from-blue-100 dark:to-indigo-200 bg-clip-text text-transparent mb-6 tracking-tight">Perkembangan Nilai Rata-rata</h2>
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