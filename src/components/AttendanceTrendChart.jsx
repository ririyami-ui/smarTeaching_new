import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useSettings } from '../utils/SettingsContext';
import { Calendar, TrendingUp } from 'lucide-react';
import moment from 'moment';

const AttendanceTrendChart = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'
    const { activeSemester, academicYear } = useSettings();

    useEffect(() => {
        const fetchAttendanceTrend = async () => {
            if (!auth.currentUser) return;

            try {
                const userId = auth.currentUser.uid;
                const q = query(
                    collection(db, 'attendance'),
                    where('userId', '==', userId),
                    where('semester', '==', activeSemester),
                    where('academicYear', '==', academicYear)
                );

                const snapshot = await getDocs(q);
                const attendanceByDate = {};

                snapshot.docs.forEach(doc => {
                    const attendance = doc.data();
                    const dateKey = moment(attendance.date).format('YYYY-MM-DD');

                    if (!attendanceByDate[dateKey]) {
                        attendanceByDate[dateKey] = {
                            date: dateKey,
                            Hadir: 0,
                            Sakit: 0,
                            Ijin: 0,
                            Alpha: 0,
                            total: 0
                        };
                    }

                    const status = attendance.status;
                    if (attendanceByDate[dateKey][status] !== undefined) {
                        attendanceByDate[dateKey][status]++;
                        attendanceByDate[dateKey].total++;
                    }
                });

                // Convert to array and sort by date
                let chartData = Object.values(attendanceByDate)
                    .sort((a, b) => new Date(a.date) - new Date(b.date));

                // Filter based on view mode
                if (viewMode === 'week') {
                    const weekAgo = moment().subtract(7, 'days');
                    chartData = chartData.filter(item => moment(item.date).isAfter(weekAgo));
                } else {
                    const monthAgo = moment().subtract(30, 'days');
                    chartData = chartData.filter(item => moment(item.date).isAfter(monthAgo));
                }

                // Format dates for display
                chartData = chartData.map(item => ({
                    ...item,
                    displayDate: moment(item.date).format('DD MMM'),
                    // Calculate percentages for tooltip
                    hadirPct: item.total > 0 ? ((item.Hadir / item.total) * 100).toFixed(1) : 0
                }));

                setData(chartData);
            } catch (error) {
                console.error("Error fetching attendance trend:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAttendanceTrend();
    }, [auth.currentUser, activeSemester, academicYear, viewMode]);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
                    <p className="font-bold text-gray-900 dark:text-white mb-2">{data.displayDate}</p>
                    <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-gray-700 dark:text-gray-300">Hadir: <strong>{data.Hadir}</strong> ({data.hadirPct}%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span className="text-gray-700 dark:text-gray-300">Sakit: <strong>{data.Sakit}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-gray-700 dark:text-gray-300">Ijin: <strong>{data.Ijin}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-gray-700 dark:text-gray-300">Alpha: <strong>{data.Alpha}</strong></span>
                        </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Total: <strong>{data.total}</strong></span>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-6 rounded-3xl shadow-lg">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded-2xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-6 rounded-3xl shadow-lg">
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2">
                    <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
                    <div>
                        <h2 className="text-xl font-black bg-gradient-to-r from-blue-900 to-indigo-900 dark:from-blue-100 dark:to-indigo-200 bg-clip-text text-transparent tracking-tight">
                            Tren Kehadiran
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {viewMode === 'week' ? '7 Hari Terakhir' : '30 Hari Terakhir'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('week')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${viewMode === 'week'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        Minggu
                    </button>
                    <button
                        onClick={() => setViewMode('month')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${viewMode === 'month'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        Bulan
                    </button>
                </div>
            </div>

            <div className="h-80">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="colorSakit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="colorIjin" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="colorAlpha" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                            <XAxis
                                dataKey="displayDate"
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                stroke="#9CA3AF"
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                stroke="#9CA3AF"
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                iconType="circle"
                            />
                            <Area
                                type="monotone"
                                dataKey="Hadir"
                                stackId="1"
                                stroke="#10B981"
                                fillOpacity={1}
                                fill="url(#colorHadir)"
                            />
                            <Area
                                type="monotone"
                                dataKey="Sakit"
                                stackId="1"
                                stroke="#F59E0B"
                                fillOpacity={1}
                                fill="url(#colorSakit)"
                            />
                            <Area
                                type="monotone"
                                dataKey="Ijin"
                                stackId="1"
                                stroke="#3B82F6"
                                fillOpacity={1}
                                fill="url(#colorIjin)"
                            />
                            <Area
                                type="monotone"
                                dataKey="Alpha"
                                stackId="1"
                                stroke="#EF4444"
                                fillOpacity={1}
                                fill="url(#colorAlpha)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                            <Calendar size={48} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">Belum ada data kehadiran</p>
                            <p className="text-xs text-gray-500 mt-1">untuk periode ini</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceTrendChart;
