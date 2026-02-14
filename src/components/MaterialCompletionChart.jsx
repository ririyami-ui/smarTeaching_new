import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useSettings } from '../utils/SettingsContext';
import { AlertCircle, CheckCircle2, BookOpen, TrendingUp } from 'lucide-react';

const MaterialCompletionChart = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [animatedRate, setAnimatedRate] = useState(0);
    const { activeSemester, academicYear } = useSettings();

    useEffect(() => {
        const fetchData = async () => {
            if (!auth.currentUser) return;

            try {
                const q = query(
                    collection(db, 'teachingJournals'),
                    where('userId', '==', auth.currentUser.uid),
                    where('semester', '==', activeSemester),
                    where('academicYear', '==', academicYear)
                );

                const snapshot = await getDocs(q);
                let terlaksana = 0;
                let tidakTerlaksana = 0;

                snapshot.docs.forEach(doc => {
                    const journal = doc.data();
                    if (journal.isImplemented) {
                        terlaksana++;
                    } else {
                        tidakTerlaksana++;
                    }
                });

                const chartData = [
                    { name: 'Terlaksana', value: terlaksana },
                    { name: 'Tidak Terlaksana', value: tidakTerlaksana }
                ];

                setData(chartData);
            } catch (error) {
                console.error("Error fetching material completion data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [auth.currentUser, activeSemester, academicYear]);

    // Animated completion rate
    useEffect(() => {
        if (data.length > 0) {
            const total = data.reduce((acc, curr) => acc + curr.value, 0);
            const targetRate = total > 0 ? ((data[0].value / total) * 100) : 0;

            let currentRate = 0;
            const increment = targetRate / 30;
            const timer = setInterval(() => {
                currentRate += increment;
                if (currentRate >= targetRate) {
                    setAnimatedRate(targetRate);
                    clearInterval(timer);
                } else {
                    setAnimatedRate(currentRate);
                }
            }, 20);

            return () => clearInterval(timer);
        }
    }, [data]);

    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    const completionRate = total > 0 ? ((data[0].value / total) * 100) : 0;

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            return (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
                    <p className="font-bold text-gray-900 dark:text-white mb-2">{data.name}</p>
                    <div className="space-y-1 text-sm">
                        <p className="text-gray-700 dark:text-gray-300">
                            Jumlah: <strong>{data.value}</strong> jurnal
                        </p>
                        <p className="text-gray-700 dark:text-gray-300">
                            Persentase: <strong>{((data.value / total) * 100).toFixed(1)}%</strong>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-6 rounded-3xl shadow-lg h-full">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                    <div className="h-48 bg-gray-300 dark:bg-gray-700 rounded-2xl mb-4"></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="h-20 bg-gray-300 dark:bg-gray-700 rounded-2xl"></div>
                        <div className="h-20 bg-gray-300 dark:bg-gray-700 rounded-2xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-white/50 to-blue-50/50 dark:from-black/50 dark:to-blue-950/30 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 h-full flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                        <BookOpen size={24} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black bg-gradient-to-r from-blue-900 to-indigo-900 dark:from-blue-100 dark:to-indigo-200 bg-clip-text text-transparent tracking-tight">
                            Ketuntasan Materi
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            Semester {activeSemester} {academicYear}
                        </p>
                    </div>
                </div>

                {total > 0 && (
                    <div className={`px-4 py-2 rounded-2xl text-xs font-black shadow-lg transition-all duration-300 ${completionRate >= 90 ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' :
                            completionRate >= 75 ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white' :
                                completionRate >= 60 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' :
                                    'bg-gradient-to-r from-red-500 to-pink-600 text-white'
                        }`}>
                        <div className="flex items-center gap-1">
                            <TrendingUp size={14} />
                            {completionRate.toFixed(0)}%
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 min-h-[240px] relative">
                {total > 0 ? (
                    <>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <defs>
                                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#EF4444" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#DC2626" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={95}
                                    paddingAngle={3}
                                    dataKey="value"
                                    animationDuration={1000}
                                    animationBegin={0}
                                >
                                    <Cell fill="url(#greenGradient)" />
                                    <Cell fill="url(#redGradient)" />
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Animated Center Content */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-4 text-center pointer-events-none">
                            <div className="relative">
                                {/* Circular Progress Ring */}
                                <svg className="absolute -inset-8 w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="54"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        className="text-gray-200 dark:text-gray-700"
                                    />
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="54"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        strokeDasharray={`${2 * Math.PI * 54}`}
                                        strokeDashoffset={`${2 * Math.PI * 54 * (1 - animatedRate / 100)}`}
                                        strokeLinecap="round"
                                        className={`transition-all duration-1000 ${completionRate >= 75 ? 'text-green-500' : 'text-yellow-500'
                                            }`}
                                    />
                                </svg>

                                <div className="relative z-10">
                                    <div className="text-4xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                                        {animatedRate.toFixed(0)}%
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">
                                        Tuntas
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                        <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800">
                            <AlertCircle size={32} className="opacity-50" />
                        </div>
                        <div className="text-center">
                            <span className="text-sm font-bold block">Belum ada data jurnal</span>
                            <span className="text-xs text-gray-500 dark:text-gray-500">untuk semester ini</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Enhanced Statistics Cards */}
            {total > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 p-4 rounded-2xl border-2 border-green-200/50 dark:border-green-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white shadow-md">
                                <CheckCircle2 size={20} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-green-700 dark:text-green-300">{data[0].value}</div>
                                <div className="text-[10px] uppercase font-bold text-green-600/70 dark:text-green-400 tracking-wider">Terlaksana</div>
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-700">
                            <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                                {((data[0].value / total) * 100).toFixed(1)}% dari total
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/20 p-4 rounded-2xl border-2 border-red-200/50 dark:border-red-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl text-white shadow-md">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-red-700 dark:text-red-300">{data[1].value}</div>
                                <div className="text-[10px] uppercase font-bold text-red-600/70 dark:text-red-400 tracking-wider">Tertunda</div>
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-700">
                            <div className="text-xs font-semibold text-red-600 dark:text-red-400">
                                {((data[1].value / total) * 100).toFixed(1)}% dari total
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {total > 0 && (
                <div className="mt-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-200 dark:border-blue-800">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                            Total {total} Jurnal Mengajar
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaterialCompletionChart;
