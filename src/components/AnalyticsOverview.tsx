import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../utils/SettingsContext';
import { TrendingUp, TrendingDown, Minus, Calendar, BookOpen, ClipboardCheck } from 'lucide-react';
import moment from 'moment';

// Glass Icon Wrapper Component
interface GlassIconProps {
  icon: React.ElementType;
  colorClass?: string;
  size?: number;
}

const GlassIcon: React.FC<GlassIconProps> = ({ icon: Icon, colorClass = "glass-glow-blue", size = 20 }) => (
    <div className={`glass-icon-container ${colorClass} w-10 h-10 sm:w-12 sm:h-12 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
        <Icon size={size} className="text-gray-800 dark:text-white opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
    </div>
);

interface TrendIndicatorProps {
  current: number;
  previous: number;
  suffix?: string;
  isInverted?: boolean;
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({ current, previous, suffix = '%', isInverted = false }) => {
    if (previous === 0 && current === 0) {
        return <span className="text-gray-400 text-xs flex items-center gap-1"><Minus size={14} /> Tidak ada data</span>;
    }

    const change = previous > 0 ? ((current - previous) / previous * 100) : 0;
    const isPositive = isInverted ? change < 0 : change > 0;

    if (Math.abs(change) < 0.1) {
        return <span className="text-gray-600 dark:text-gray-400 text-xs flex items-center gap-1"><Minus size={14} /> Stabil</span>;
    }

    return (
        <span className={`text-xs font-bold flex items-center gap-1 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(change).toFixed(1)}{suffix}
        </span>
    );
};

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  suffix?: string;
  trend: React.ReactNode;
  colorClass?: string;
  glowClass?: string;
  index: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, suffix = '', trend, colorClass, glowClass, index }) => (
    <div
        className={`chart-container-glass p-4 sm:p-5 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 ${glowClass} animate-fade-in-up group`}
        style={{ animationDelay: `${index * 150}ms` }}
    >
        <div className="flex items-start justify-between mb-3">
            <GlassIcon icon={Icon} colorClass={colorClass} size={24} />
            <div className="flex items-center gap-1">
                {trend}
            </div>
        </div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-1 opacity-70">{title}</p>
            <div className="flex items-baseline gap-1">
                <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{value}</p>
                <span className="text-sm font-bold text-gray-400">{suffix}</span>
            </div>
        </div>
    </div>
);

interface WeeklyStats {
  thisWeek: { attendance: number; avgGrade: number; journals: number };
  lastWeek: { attendance: number; avgGrade: number; journals: number };
}

const AnalyticsOverview: React.FC = () => {
    const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
        thisWeek: { attendance: 0, avgGrade: 0, journals: 0 },
        lastWeek: { attendance: 0, avgGrade: 0, journals: 0 }
    });
    const [loading, setLoading] = useState<boolean>(true);
    const { activeSemester, academicYear } = useSettings();
    const { user } = useAuth();

    useEffect(() => {
        const fetchWeeklyStats = async () => {
            if (!user) return;

            try {
                const userId = user.uid;

                // Define date ranges
                const thisWeekStart = moment().startOf('week');
                const thisWeekEnd = moment().endOf('week');
                const lastWeekStart = moment().subtract(1, 'week').startOf('week');
                const lastWeekEnd = moment().subtract(1, 'week').endOf('week');

                // Fetch attendance data
                const attendanceQuery = query(
                    collection(db, 'attendance'),
                    where('userId', '==', userId),
                    where('semester', '==', activeSemester),
                    where('academicYear', '==', academicYear)
                );
                const attendanceSnap = await getDocs(attendanceQuery);

                let thisWeekAttendance = 0, thisWeekTotal = 0;
                let lastWeekAttendance = 0, lastWeekTotal = 0;

                attendanceSnap.docs.forEach(doc => {
                    const data = doc.data();
                    const date = moment(data.date);

                    if (date.isBetween(thisWeekStart, thisWeekEnd, null, '[]')) {
                        thisWeekTotal++;
                        if (data.status === 'Hadir') thisWeekAttendance++;
                    } else if (date.isBetween(lastWeekStart, lastWeekEnd, null, '[]')) {
                        lastWeekTotal++;
                        if (data.status === 'Hadir') lastWeekAttendance++;
                    }
                });

                // Fetch grades data
                const gradesQuery = query(
                    collection(db, 'grades'),
                    where('userId', '==', userId),
                    where('semester', '==', activeSemester),
                    where('academicYear', '==', academicYear)
                );
                const gradesSnap = await getDocs(gradesQuery);

                let thisWeekGrades: number[] = [], lastWeekGrades: number[] = [];

                gradesSnap.docs.forEach(doc => {
                    const data = doc.data();
                    const date = moment(data.date);
                    const score = parseFloat(data.score);

                    if (!isNaN(score)) {
                        if (date.isBetween(thisWeekStart, thisWeekEnd, null, '[]')) {
                            thisWeekGrades.push(score);
                        } else if (date.isBetween(lastWeekStart, lastWeekEnd, null, '[]')) {
                            lastWeekGrades.push(score);
                        }
                    }
                });

                // Fetch journals data
                const journalsQuery = query(
                    collection(db, 'teachingJournals'),
                    where('userId', '==', userId),
                    where('semester', '==', activeSemester),
                    where('academicYear', '==', academicYear),
                    where('isImplemented', '==', true)
                );
                const journalsSnap = await getDocs(journalsQuery);

                let thisWeekJournals = 0, lastWeekJournals = 0;

                journalsSnap.docs.forEach(doc => {
                    const data = doc.data();
                    const date = moment(data.date);

                    if (date.isBetween(thisWeekStart, thisWeekEnd, null, '[]')) {
                        thisWeekJournals++;
                    } else if (date.isBetween(lastWeekStart, lastWeekEnd, null, '[]')) {
                        lastWeekJournals++;
                    }
                });

                // Calculate stats
                setWeeklyStats({
                    thisWeek: {
                        attendance: thisWeekTotal > 0 ? (thisWeekAttendance / thisWeekTotal * 100) : 0,
                        avgGrade: thisWeekGrades.length > 0 ? thisWeekGrades.reduce((a, b) => a + b, 0) / thisWeekGrades.length : 0,
                        journals: thisWeekJournals
                    },
                    lastWeek: {
                        attendance: lastWeekTotal > 0 ? (lastWeekAttendance / lastWeekTotal * 100) : 0,
                        avgGrade: lastWeekGrades.length > 0 ? lastWeekGrades.reduce((a, b) => a + b, 0) / lastWeekGrades.length : 0,
                        journals: lastWeekJournals
                    }
                });

            } catch (error) {
                console.error("Error fetching weekly stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWeeklyStats();
    }, [user, activeSemester, academicYear]);

    if (loading) {
        return (
            <div className="chart-container-glass p-6">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-xl w-1/4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="h-36 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
                        <div className="h-36 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
                        <div className="h-36 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="chart-container-glass p-4 sm:p-6 md:p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full group-hover:bg-blue-500/20 transition-colors duration-700"></div>

            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 relative z-10">
                <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/20 ring-4 ring-white/10">
                    <Calendar size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div>
                    <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent tracking-tight">
                        Ringkasan Performa
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Statistik Mingguan</p>
                        <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-900/50">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-tighter">Live</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                <StatCard
                    index={0}
                    icon={ClipboardCheck}
                    title="Tingkat Kehadiran"
                    value={weeklyStats.thisWeek.attendance.toFixed(1)}
                    suffix="%"
                    trend={<TrendIndicator current={weeklyStats.thisWeek.attendance} previous={weeklyStats.lastWeek.attendance} suffix="%" />}
                    colorClass="glass-glow-green"
                    glowClass="hover:chart-glow-green"
                />

                <StatCard
                    index={1}
                    icon={TrendingUp}
                    title="Rata-rata Nilai"
                    value={weeklyStats.thisWeek.avgGrade.toFixed(1)}
                    suffix="poin"
                    trend={<TrendIndicator current={weeklyStats.thisWeek.avgGrade} previous={weeklyStats.lastWeek.avgGrade} suffix="" />}
                    colorClass="glass-glow-blue"
                    glowClass="hover:chart-glow-blue"
                />

                <StatCard
                    index={2}
                    icon={BookOpen}
                    title="Jurnal Terlaksana"
                    value={weeklyStats.thisWeek.journals}
                    suffix="sesi"
                    trend={<TrendIndicator current={weeklyStats.thisWeek.journals} previous={weeklyStats.lastWeek.journals} suffix="" />}
                    colorClass="glass-glow-purple"
                    glowClass="hover:chart-glow-purple"
                />
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 relative z-10">
                <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1 opacity-50"></div>
                <div className="px-4 py-1.5 rounded-xl bg-gray-100/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                    vs. {moment().subtract(1, 'week').format('DD MMM')} - {moment().subtract(1, 'week').endOf('week').format('DD MMM')}
                </div>
                <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1 opacity-50"></div>
            </div>
        </div>
    );
};

export default AnalyticsOverview;

