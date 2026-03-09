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
import AnalyticsOverview from '../components/AnalyticsOverview';
import AttendanceTrendChart from '../components/AttendanceTrendChart';
import GradeDistributionChart from '../components/GradeDistributionChart';

// 3D Icon Paths
// Glass Icon Wrapper Component
const GlassIcon = ({ icon: Icon, colorClass = "glass-glow-blue", size = 20 }) => (
  <div className={`glass-icon-container ${colorClass} w-10 h-10 sm:w-12 sm:h-12 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
    <Icon size={size} className="text-gray-800 dark:text-white opacity-80" />
    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
  </div>
);

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







const StatCard = ({ icon: Icon, label, value, colorClass, delay = "" }) => (
  <div className={`bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-4 sm:p-5 md:p-6 rounded-3xl shadow-xl flex items-center gap-4 sm:gap-6 transition-all duration-500 md:hover:scale-[1.02] md:hover:z-10 md:hover:rotate-1 hover:shadow-blue-500/20 dark:hover:shadow-none overflow-hidden group stagger-entry ${delay}`}>
    <GlassIcon icon={Icon} colorClass={colorClass} size={24} />
    <div className="min-w-0">
      <p className="text-text-muted-light dark:text-text-muted-dark text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-70 mb-0.5 sm:mb-1">{label}</p>
      <p className="text-2xl sm:text-3xl font-black text-text-light dark:text-text-dark tracking-tight">{value}</p>
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
  const { activeSemester, academicYear, activeTemplateId } = useSettings();
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

        const userDocRef = doc(db, 'users', auth.currentUser.uid);

        unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();

            if (userData.school) {
              setSchoolName(userData.school);
            }
            setCurrentUserProfile(userData);
          } else {

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
      if (auth.currentUser && activeTemplateId) {

        const q = query(
          collection(db, 'teachingSchedules'),
          where('userId', '==', auth.currentUser.uid),
          where('templateId', '==', activeTemplateId)
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
  }, [activeTemplateId]);

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
            userProfile={currentUserProfile}
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
          userProfile={currentUserProfile}
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
        activeTemplateId={activeTemplateId}
        onUpdateMissingCount={setMissingJournalsCount}
      />

      {/* Middle Section: Holiday Widget & Student Recap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Holiday Widget (1/3) */}
        <div className="lg:col-span-1 h-full">
          <HolidayWidget />
        </div>

        {/* Student Recap Section (2/3) */}
        <div className="lg:col-span-2 bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-4 sm:p-6 rounded-3xl shadow-lg">
          <h2 className="text-xl sm:text-2xl font-black mb-4 sm:mb-6 tracking-tight flex items-center gap-3">
            <Users size={20} className="text-primary sm:w-6 sm:h-6" />
            <span className="bg-gradient-to-r from-blue-900 to-indigo-900 dark:from-blue-100 dark:to-indigo-200 bg-clip-text text-transparent">Rekap Siswa</span>
          </h2>

          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-4 mb-6"> {/* Grid for total counts */}
            <StatCard
              icon={Users}
              label="Total Siswa"
              value={studentStats.totalStudents}
              colorClass="glass-glow-green"
              delay="delay-[100ms]"
            />
            <StatCard
              icon={Users}
              label="Laki-laki"
              value={studentStats.maleStudents}
              colorClass="glass-glow-blue"
              delay="delay-[200ms]"
            />
            <StatCard
              icon={Users}
              label="Perempuan"
              value={studentStats.femaleStudents}
              colorClass="glass-glow-red"
              delay="delay-[300ms]"
            />
          </div>

          {Object.keys(studentStats.studentsByRombel).length > 0 && (
            <div className="mt-6">
              <h3 className="text-base sm:text-lg font-semibold text-text-light dark:text-text-dark mb-3 flex items-center gap-2">
                <Users size={16} className="text-primary sm:w-4.5 sm:h-4.5" />
                <span>Siswa per Rombel:</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> {/* Adjusted grid layout for 2/3 width */}
                {Object.entries(studentStats.studentsByRombel).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })).map(([rombel, data]) => (
                  <Link to={`/analisis-rombel/${rombel}`} key={rombel} className="block p-3 sm:p-4 rounded-[1.5rem] border border-blue-200/30 dark:border-blue-800/30 bg-white/40 dark:bg-black/40 backdrop-blur-sm text-blue-800 dark:text-blue-200 flex items-center space-x-3 sm:space-x-4 hover:bg-blue-500 hover:text-white transition-all duration-500 group shadow-sm hover:shadow-blue-500/20 md:hover:scale-[1.03]">
                    <GlassIcon icon={Users} colorClass="glass-glow-blue" size={18} />
                    <div className="min-w-0">
                      <p className="text-sm sm:text-md font-black tracking-tight truncate">{rombel}</p>
                      <p className="text-[9px] sm:text-[10px] font-bold uppercase opacity-60">Total: {data.total} (L:{data.male}, P:{data.female})</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Analytics Overview Section */}
      <AnalyticsOverview />

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceTrendChart />
        <GradeDistributionChart />
      </div>

      {/* Bottom Section: Material Completion */}
      <div className="grid grid-cols-1 gap-6">
        <MaterialCompletionChart />
      </div>
    </div>
  );
};