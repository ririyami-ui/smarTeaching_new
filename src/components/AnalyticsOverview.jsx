import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useSettings } from '../utils/SettingsContext';
import { TrendingUp, TrendingDown, Minus, Calendar, BookOpen, ClipboardCheck } from 'lucide-react';
import moment from 'moment';

const AnalyticsOverview = () => {
    const [weeklyStats, setWeeklyStats] = useState({
        thisWeek: { attendance: 0, avgGrade: 0, journals: 0 },
        lastWeek: { attendance: 0, avgGrade: 0, journals: 0 }
    });
    const [loading, setLoading] = useState(true);
    const { activeSemester, academicYear } = useSettings();

    useEffect(() => {
        const fetchWeeklyStats = async () => {
            if (!auth.currentUser) return;

            try {
                const userId = auth.currentUser.uid;

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

                let thisWeekGrades = [], lastWeekGrades = [];

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
    }, [auth.currentUser, activeSemester, academicYear]);

    const TrendIndicator = ({ current, previous, suffix = '%', isInverted = false }) => {
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

    const StatCard = ({ icon: Icon, title, value, suffix = '', trend, color }) => (
        <div className={`bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-5 rounded-3xl shadow-lg transition-all duration-300 hover:shadow-xl ${color}`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${color} shadow-inner`}>
                    <Icon size={24} className="text-white" />
                </div>
                <div className="text-right">
                    {trend}
                </div>
            </div>
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">{title}</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{value}{suffix}</p>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-6 rounded-3xl shadow-lg">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded-2xl"></div>
                        <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded-2xl"></div>
                        <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded-2xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-6 rounded-3xl shadow-lg">
            <div className="flex items-center gap-2 mb-6">
                <Calendar className="text-blue-600 dark:text-blue-400" size={24} />
                <h2 className="text-2xl font-black bg-gradient-to-r from-blue-900 to-indigo-900 dark:from-blue-100 dark:to-indigo-200 bg-clip-text text-transparent tracking-tight">
                    Performa Minggu Ini
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    icon={ClipboardCheck}
                    title="Tingkat Kehadiran"
                    value={weeklyStats.thisWeek.attendance.toFixed(1)}
                    suffix="%"
                    trend={<TrendIndicator current={weeklyStats.thisWeek.attendance} previous={weeklyStats.lastWeek.attendance} suffix="%" />}
                    color="from-emerald-500 to-green-600"
                />

                <StatCard
                    icon={TrendingUp}
                    title="Rata-rata Nilai"
                    value={weeklyStats.thisWeek.avgGrade.toFixed(1)}
                    suffix=""
                    trend={<TrendIndicator current={weeklyStats.thisWeek.avgGrade} previous={weeklyStats.lastWeek.avgGrade} suffix=" poin" />}
                    color="from-blue-500 to-indigo-600"
                />

                <StatCard
                    icon={BookOpen}
                    title="Jurnal Terlaksana"
                    value={weeklyStats.thisWeek.journals}
                    suffix=" jurnal"
                    trend={<TrendIndicator current={weeklyStats.thisWeek.journals} previous={weeklyStats.lastWeek.journals} suffix=" jurnal" />}
                    color="from-purple-500 to-pink-600"
                />
            </div>

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                Perbandingan vs minggu lalu ({moment().subtract(1, 'week').format('DD MMM')} - {moment().subtract(1, 'week').endOf('week').format('DD MMM')})
            </div>
        </div>
    );
};

export default AnalyticsOverview;
