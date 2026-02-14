import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useSettings } from '../utils/SettingsContext';
import { BarChart3, TrendingUp, AlertCircle } from 'lucide-react';

const GradeDistributionChart = () => {
    const [data, setData] = useState([]);
    const [stats, setStats] = useState({ avg: 0, median: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const { activeSemester, academicYear } = useSettings();

    useEffect(() => {
        const fetchGradeDistribution = async () => {
            if (!auth.currentUser) return;

            try {
                const userId = auth.currentUser.uid;
                const q = query(
                    collection(db, 'grades'),
                    where('userId', '==', userId),
                    where('semester', '==', activeSemester),
                    where('academicYear', '==', academicYear)
                );

                const snapshot = await getDocs(q);
                const grades = [];

                snapshot.docs.forEach(doc => {
                    const grade = doc.data();
                    const score = parseFloat(grade.score);
                    if (!isNaN(score) && score >= 0 && score <= 100) {
                        grades.push(score);
                    }
                });

                // Create distribution buckets
                const distribution = {
                    'Sangat Rendah\n(0-50)': { count: 0, range: [0, 50], color: '#EF4444' },
                    'Rendah\n(51-75)': { count: 0, range: [51, 75], color: '#F59E0B' },
                    'Baik\n(76-85)': { count: 0, range: [76, 85], color: '#3B82F6' },
                    'Sangat Baik\n(86-100)': { count: 0, range: [86, 100], color: '#10B981' }
                };

                grades.forEach(grade => {
                    if (grade <= 50) distribution['Sangat Rendah\n(0-50)'].count++;
                    else if (grade <= 75) distribution['Rendah\n(51-75)'].count++;
                    else if (grade <= 85) distribution['Baik\n(76-85)'].count++;
                    else distribution['Sangat Baik\n(86-100)'].count++;
                });

                // Convert to chart data
                const chartData = Object.entries(distribution).map(([name, data]) => ({
                    name,
                    Jumlah: data.count,
                    color: data.color,
                    percentage: grades.length > 0 ? ((data.count / grades.length) * 100).toFixed(1) : 0
                }));

                setData(chartData);

                // Calculate statistics
                if (grades.length > 0) {
                    const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
                    const sorted = [...grades].sort((a, b) => a - b);
                    const median = sorted.length % 2 === 0
                        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
                        : sorted[Math.floor(sorted.length / 2)];

                    setStats({ avg, median, total: grades.length });
                }

            } catch (error) {
                console.error("Error fetching grade distribution:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGradeDistribution();
    }, [auth.currentUser, activeSemester, academicYear]);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
                    <p className="font-bold text-gray-900 dark:text-white mb-2">{data.name.replace('\n', ' ')}</p>
                    <div className="space-y-1 text-sm">
                        <p className="text-gray-700 dark:text-gray-300">
                            Jumlah: <strong>{data.Jumlah}</strong> siswa
                        </p>
                        <p className="text-gray-700 dark:text-gray-300">
                            Persentase: <strong>{data.percentage}%</strong>
                        </p>
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
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-2">
                    <BarChart3 className="text-blue-600 dark:text-blue-400" size={24} />
                    <div>
                        <h2 className="text-xl font-black bg-gradient-to-r from-blue-900 to-indigo-900 dark:from-blue-100 dark:to-indigo-200 bg-clip-text text-transparent tracking-tight">
                            Distribusi Nilai
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            Semester {activeSemester} {academicYear}
                        </p>
                    </div>
                </div>

                {stats.total > 0 && (
                    <div className="text-right">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rata-rata</div>
                        <div className={`text-2xl font-black ${stats.avg >= 85 ? 'text-green-600' :
                                stats.avg >= 75 ? 'text-blue-600' :
                                    stats.avg >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                            {stats.avg.toFixed(1)}
                        </div>
                    </div>
                )}
            </div>

            {stats.total > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl border border-blue-100 dark:border-blue-800">
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">Total Data</div>
                        <div className="text-2xl font-black text-blue-700 dark:text-blue-300">{stats.total}</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-2xl border border-purple-100 dark:border-purple-800">
                        <div className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider mb-1">Rata-rata</div>
                        <div className="text-2xl font-black text-purple-700 dark:text-purple-300">{stats.avg.toFixed(1)}</div>
                    </div>
                    <div className="bg-pink-50 dark:bg-pink-900/20 p-3 rounded-2xl border border-pink-100 dark:border-pink-800">
                        <div className="text-xs text-pink-600 dark:text-pink-400 font-bold uppercase tracking-wider mb-1">Median</div>
                        <div className="text-2xl font-black text-pink-700 dark:text-pink-300">{stats.median.toFixed(1)}</div>
                    </div>
                </div>
            )}

            <div className="h-80">
                {stats.total > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11, fill: '#6B7280' }}
                                stroke="#9CA3AF"
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                stroke="#9CA3AF"
                                label={{ value: 'Jumlah Siswa', angle: -90, position: 'insideLeft', fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
                            <Bar dataKey="Jumlah" radius={[8, 8, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                            <AlertCircle size={48} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">Belum ada data nilai</p>
                            <p className="text-xs text-gray-500 mt-1">untuk semester ini</p>
                        </div>
                    </div>
                )}
            </div>

            {stats.total > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {data.map((category, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                            <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: category.color }}></div>
                            <div>
                                <div className="text-xs font-bold text-gray-900 dark:text-white">{category.percentage}%</div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400">{category.name.split('\n')[0]}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GradeDistributionChart;
