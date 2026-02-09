import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useSettings } from '../utils/SettingsContext';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const MaterialCompletionChart = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
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

                // Jika data kosong, set default agar chart tidak error (opsional, atau biarkan kosong)
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

    const COLORS = ['#10B981', '#EF4444']; // Green for success, Red for failure

    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    const completionRate = total > 0 ? ((data[0].value / total) * 100).toFixed(0) : 0;

    return (
        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-6 rounded-3xl shadow-lg h-full flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-xl font-black bg-gradient-to-r from-blue-900 to-indigo-900 dark:from-blue-100 dark:to-indigo-200 bg-clip-text text-transparent tracking-tight">Ketuntasan Materi</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Semester {activeSemester} {academicYear}</p>
                </div>
                {total > 0 && (
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${completionRate >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {completionRate}% Tuntas
                    </div>
                )}
            </div>

            <div className="flex-1 min-h-[200px] relative">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">Memuat data...</div>
                ) : total > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ color: '#374151', fontSize: '12px', fontWeight: 'bold' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                formatter={(value, entry) => <span className="text-xs font-bold text-gray-600 dark:text-gray-300 ml-1">{value} ({entry.payload.value})</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                        <AlertCircle size={24} className="opacity-50" />
                        <span className="text-xs font-medium">Belum ada data jurnal</span>
                    </div>
                )}

                {/* Center Content for Donut Chart */}
                {total > 0 && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-4 text-center pointer-events-none">
                        <div className="text-3xl font-black text-gray-800 dark:text-white">{total}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Jurnal</div>
                    </div>
                )}
            </div>

            {/* Insight / Summary */}
            {total > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-2xl border border-green-100 dark:border-green-800 flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-800 rounded-xl text-green-600 dark:text-green-200">
                            <CheckCircle2 size={16} />
                        </div>
                        <div>
                            <div className="text-lg font-black text-green-700 dark:text-green-300">{data[0].value}</div>
                            <div className="text-[10px] uppercase font-bold text-green-600/70 dark:text-green-400">Terlaksana</div>
                        </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-2xl border border-red-100 dark:border-red-800 flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-800 rounded-xl text-red-600 dark:text-red-200">
                            <AlertCircle size={16} />
                        </div>
                        <div>
                            <div className="text-lg font-black text-red-700 dark:text-red-300">{data[1].value}</div>
                            <div className="text-[10px] uppercase font-bold text-red-600/70 dark:text-red-400">Tertunda</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaterialCompletionChart;
