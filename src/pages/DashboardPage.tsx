import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Clock, BookOpen, Users, Target, ClipboardList, Trophy, ListTodo, AlertCircle, Calendar } from 'lucide-react';
import { collection, getDocs, query, where, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
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
import type { UserProfile } from '../types';
import type { Student } from '../types/studentTypes';

interface GlassIconProps {
  icon: React.ElementType;
  colorClass?: string;
  size?: number;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  colorClass: string;
  delay?: string;
}

interface TeachingScheduleData {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  type?: string;
  subject?: string;
  class?: string;
  templateId?: string;
  [key: string]: unknown;
}

interface HolidayData {
  id: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  [key: string]: unknown;
}

const GlassIcon = ({ icon: Icon, colorClass = "glass-glow-blue", size = 20 }: GlassIconProps) => (
  <div className={`glass-icon-container ${colorClass} w-10 h-10 sm:w-12 sm:h-12 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
    <Icon size={size} className="text-gray-800 dark:text-white opacity-80" />
    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
  </div>
);

const StatCard = ({ icon: Icon, label, value, colorClass, delay = "" }: StatCardProps) => (
  <div className={`card-glass p-4 sm:p-5 md:p-6 flex items-center gap-4 sm:gap-6 transition-all duration-500 md:hover:scale-[1.02] md:hover:z-10 md:hover:rotate-1 hover:shadow-blue-500/20 dark:hover:shadow-none overflow-hidden group stagger-entry ${delay}`}>
    <GlassIcon icon={Icon} colorClass={colorClass} size={24} />
    <div className="min-w-0">
      <p className="text-text-muted-light dark:text-text-muted-dark text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-70 mb-0.5 sm:mb-1">{label}</p>
      <p className="text-2xl sm:text-3xl font-black text-text-light dark:text-text-dark tracking-tight">{value}</p>
    </div>
  </div>
);

const COLORS = ['#0088FE', '#FFBB28', '#FF8042', '#00C49F']; // Blue, Yellow, Orange, Green

interface StudentStats {
  totalStudents: number;
  maleStudents: number;
  femaleStudents: number;
  studentsByRombel: Record<string, {
    total: number;
    male: number;
    female: number;
    students: Student[];
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setTeachingSchedules] = useState<TeachingScheduleData[]>([]);
  const [todaySchedules, setTodaySchedules] = useState<TeachingScheduleData[]>([]);
  const [todayHoliday, setTodayHoliday] = useState<HolidayData | null>(null);
  const [studentStats, setStudentStats] = useState<StudentStats>({
    totalStudents: 0,
    maleStudents: 0,
    femaleStudents: 0,
    studentsByRombel: {},
  });
  const [currentTime, setCurrentTime] = useState(moment()); // Add currentTime state
  const [, setSchoolName] = useState("Nama Sekolah Anda");
  const [, setTopStudents] = useState<Record<string, unknown>[]>([]);
  const [, setAttendanceChartData] = useState<{ name: string; value: number }[]>([]);
  const [, setGradeChartData] = useState<{ name: string; 'Rata-rata Nilai': number }[]>([]);
  const [, setMissingJournalsCount] = useState<number>(0);
  const [programs, setPrograms] = useState<Record<string, unknown>[]>([]);
  const [classes, setClasses] = useState<Record<string, unknown>[]>([]);

  const [carryOverMap, setCarryOverMap] = useState<Record<string, { material: string; date: string }>>({});
  const { activeSemester, academicYear, activeTemplateId } = useSettings();
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  const [activeSchedule, setActiveSchedule] = useState<TeachingScheduleData | null>(null);

  // Update currentTime every second and detect active schedule
  const callbackRef = useRef(() => {});
  callbackRef.current = () => {
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
    setActiveSchedule(active ?? null);
  };

  useEffect(() => {
    const timer = setInterval(() => callbackRef.current(), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    const setupUserListener = async () => {
      if (user) {

        const userDocRef = doc(db, 'users', user.uid);

        unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();

            if (userData.school) {
              setSchoolName(userData.school);
            }
            setCurrentUserProfile(userData as UserProfile);
          } else {
            // no user profile
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
  }, [user]);

  useEffect(() => {
    const fetchTopStudents = async () => {
      if (!user) return;
      try {
        const studentsSnapshot = await getDocs(query(collection(db, 'students'), where('userId', '==', user.uid)));
        const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const infractionsSnapshot = await getDocs(query(collection(db, 'infractions'),
          where('userId', '==', user.uid),
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
  }, [user, activeSemester, academicYear]);

  useEffect(() => {
    const fetchHolidays = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'holidays'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const holidays: (HolidayData & Record<string, unknown>)[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HolidayData & Record<string, unknown>));

        const today = moment().startOf('day');
        const activeHoliday = holidays.find(h => {
          if (h.startDate && h.endDate) {
            const start = moment(h.startDate).startOf('day');
            const end = moment(h.endDate).endOf('day');
            return today.isBetween(start, end, null, '[]');
          }
          return h.date ? moment(h.date).isSame(today, 'day') : false;
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
  }, [user]);

  useEffect(() => {
    const fetchTeachingSchedules = async () => {
      if (user && activeTemplateId) {

        const q = query(
          collection(db, 'teachingSchedules'),
          where('userId', '==', user.uid),
          where('templateId', '==', activeTemplateId)
        );
        const querySnapshot = await getDocs(q);
        const fetchedSchedules = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Ensure 'class' is always a string (rombel)
          const className = typeof data.class === 'object' && data.class !== null
            ? data.class.rombel
            : data.class;

          return { id: doc.id, ...data, class: className } as TeachingScheduleData;
        });
        setTeachingSchedules(fetchedSchedules);

        // Filter and sort today's schedules
        const today = moment();
        const todayDayName = today.format('dddd'); // e.g., "Monday"
        const dayMap: Record<string, string> = {
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
          (schedule: TeachingScheduleData) => schedule.day === currentDayIndonesian
        ).sort((a: TeachingScheduleData, b: TeachingScheduleData) => {
          const timeA = moment(a.startTime, 'HH:mm');
          const timeB = moment(b.startTime, 'HH:mm');
          return timeA.diff(timeB);
        });

        setTodaySchedules(filteredTodaySchedules);

        // Fetch "Tidak Terlaksana" journals for Carry-over alerts
        const missedJournalsQuery = query(
          collection(db, 'teachingJournals'),
          where('userId', '==', user.uid),
          where('isImplemented', '==', false),
          where('semester', '==', activeSemester),
          where('academicYear', '==', academicYear)
        );
        const missedJournalsSnap = await getDocs(missedJournalsQuery);
        const missedMap: Record<string, { material: string; date: string }> = {};
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
        const programsQuery = query(collection(db, 'teachingPrograms'), where('userId', '==', user.uid));
        const classesQuery = query(collection(db, 'classes'), where('userId', '==', user.uid));

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

    // Initial fetch
    fetchTeachingSchedules();
  }, [user, activeTemplateId, activeSemester, academicYear]);

  useEffect(() => {
    const fetchStudentStats = async () => {
      try {
        if (!user) { // Check if user is authenticated
          setStudentStats({
            totalStudents: 0,
            maleStudents: 0,
            femaleStudents: 0,
            studentsByRombel: {},
          });
          return;
        }

        const userId = user.uid; // Get current user's UID
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
        const studentsByRombel: Record<string, { total: number; male: number; female: number; students: Student[] }> = {};

        fetchedStudents.forEach((student: Record<string, unknown>) => {
          const gender = student.gender as string | undefined;
          const rombel = student.rombel as string | undefined;
          totalStudents++;
          if (gender === 'Laki-laki') {
            maleStudents++;
          } else if (gender === 'Perempuan') {
            femaleStudents++;
          }

          if (rombel) {
            if (!studentsByRombel[rombel]) {
              studentsByRombel[rombel] = {
                total: 0,
                male: 0,
                female: 0,
                students: [],
              };
            }
            studentsByRombel[rombel].total++;
            if (gender === 'Laki-laki') {
              studentsByRombel[rombel].male++;
            } else if (gender === 'Perempuan') {
              studentsByRombel[rombel].female++;
            }
            studentsByRombel[rombel].students.push(student as unknown as Student);
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
  }, [user]);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!user) return;

      try {
        const userId = user.uid;
        const attendanceCollectionRef = collection(db, 'attendance');
        const q = query(
          attendanceCollectionRef,
          where('userId', '==', userId),
          where('semester', '==', activeSemester),
          where('academicYear', '==', academicYear)
        );
        const querySnapshot = await getDocs(q);

        const attendanceCounts: Record<string, number> = {
          'Hadir': 0,
          'Sakit': 0,
          'Ijin': 0,
          'Alpha': 0,
        };

        querySnapshot.docs.forEach(doc => {
          const status: string = doc.data().status;
          if (Object.prototype.hasOwnProperty.call(attendanceCounts, status)) {
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
  }, [user, activeSemester, academicYear]); // Re-run when user changes

  useEffect(() => {
    const fetchGradeData = async () => {
      if (!user) return;

      try {
        const userId = user.uid;
        const gradesCollectionRef = collection(db, 'grades');
        const q = query(
          gradesCollectionRef,
          where('userId', '==', userId),
          where('semester', '==', activeSemester),
          where('academicYear', '==', academicYear)
        );
        const querySnapshot = await getDocs(q);

        const gradesByDate: Record<string, { totalScore: number; count: number }> = {};

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
        })).sort((a: { name: string; 'Rata-rata Nilai': number }, b: { name: string; 'Rata-rata Nilai': number }) => new Date(a.name).getTime() - new Date(b.name).getTime());

        setGradeChartData(chartData);
      } catch (error) {
        console.error("Error fetching grade data for chart:", error);
      }
    };

    fetchGradeData();
  }, [user, activeSemester, academicYear]);

  return (
    <div className="space-y-4">
      {/* Clock Display - Full width on mobile */}
      <div className="block lg:hidden">
        <ClockDisplay showProgress={true} activeSchedule={activeSchedule as unknown as Parameters<typeof ClockDisplay>[0]['activeSchedule']} />
      </div>

      {/* Top Section: Clock and Schedule - Desktop only */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4">
          <ClockDisplay showProgress={true} activeSchedule={activeSchedule as unknown as Parameters<typeof ClockDisplay>[0]['activeSchedule']} />
        </div>
        <div className="lg:col-span-8">
          <TeachingScheduleCard
            schedules={todaySchedules as unknown as Parameters<typeof TeachingScheduleCard>[0]['schedules']}
            currentTime={currentTime}
            holiday={todayHoliday as unknown as Parameters<typeof TeachingScheduleCard>[0]['holiday']}
            programs={programs}
            classes={classes as unknown as Parameters<typeof TeachingScheduleCard>[0]['classes']}
            carryOverMap={carryOverMap as unknown as Parameters<typeof TeachingScheduleCard>[0]['carryOverMap']}
            activeSemester={activeSemester}
            academicYear={academicYear}
            userProfile={currentUserProfile as unknown as Parameters<typeof TeachingScheduleCard>[0]['userProfile']}
          />
        </div>
      </div>

      {/* Schedule Card - Mobile only */}
      <div className="block lg:hidden">
        <TeachingScheduleCard
          schedules={todaySchedules as unknown as Parameters<typeof TeachingScheduleCard>[0]['schedules']}
          currentTime={currentTime}
          holiday={todayHoliday as unknown as Parameters<typeof TeachingScheduleCard>[0]['holiday']}
          programs={programs}
          classes={classes as unknown as Parameters<typeof TeachingScheduleCard>[0]['classes']}
          carryOverMap={carryOverMap as unknown as Parameters<typeof TeachingScheduleCard>[0]['carryOverMap']}
          activeSemester={activeSemester}
          academicYear={academicYear}
          userProfile={currentUserProfile as unknown as Parameters<typeof TeachingScheduleCard>[0]['userProfile']}
        />
      </div>




      {/* Reminders Section */}
      <TaskReminder
        user={user as unknown as { uid: string; [key: string]: unknown }}
        activeSemester={activeSemester}
        academicYear={academicYear}
      />

      <JournalReminder
        user={user as unknown as { uid: string; [key: string]: unknown }}
        activeSemester={activeSemester}
        academicYear={academicYear}
        activeTemplateId={activeTemplateId || ''}
        onUpdateMissingCount={setMissingJournalsCount}
      />

      {/* Middle Section: Holiday Widget & Student Recap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Holiday Widget (4/12) */}
        <div className="lg:col-span-4 h-full">
          <HolidayWidget />
        </div>

        {/* Student Recap Section (8/12) */}
        <div className="lg:col-span-8 bg-surface-light/40 dark:bg-surface-dark/40 backdrop-blur-xl border border-white/40 dark:border-white/10 p-4 sm:p-6 rounded-[2.5rem] shadow-xl">
          <h2 className="text-xl sm:text-2xl font-black mb-4 sm:mb-6 tracking-tight flex items-center gap-3">
            <Users size={20} className="text-primary sm:w-6 sm:h-6" />
            <span className="bg-gradient-to-r from-primary-900 to-primary-600 dark:from-primary-100 dark:to-primary-400 bg-clip-text text-transparent">Rekap Siswa</span>
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
                {Object.entries(studentStats.studentsByRombel).sort(([aName]: [string, { total: number; male: number; female: number; students: Student[] }], [bName]: [string, { total: number; male: number; female: number; students: Student[] }]) => aName.localeCompare(bName, undefined, { numeric: true })).map(([rombel, data]: [string, { total: number; male: number; female: number; students: Student[] }]) => (
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
}


