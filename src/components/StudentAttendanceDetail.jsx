import React from 'react';
import { Calendar } from 'lucide-react';
import moment from 'moment';
import PieChart from './PieChart';

const StudentAttendanceDetail = ({ stats, attendance }) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600">
                        <Calendar size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Detail Kehadiran</h2>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <div className="w-full">
                    <PieChart data={stats.attendance} numDays={stats.numDays} studentCount={stats.studentCount || 1} />
                </div>
                <div className="w-full max-h-[350px] overflow-y-auto custom-scrollbar pr-2 bg-gray-50/50 dark:bg-gray-900/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                    <table className="w-full text-left">
                        <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <tr>
                                <th className="pb-3">Tanggal</th>
                                <th className="pb-3">Hari</th>
                                <th className="pb-3 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs divide-y dark:divide-gray-700">
                            {attendance.length > 0 ? attendance.map((att, i) => (
                                <tr key={i} className="group hover:bg-white dark:hover:bg-gray-800 transition-colors">
                                    <td className="py-3 text-gray-500 text-[10px] font-medium">{moment(att.date).format('DD/MM/YY')}</td>
                                    <td className="py-3 font-bold text-gray-800 dark:text-gray-200">
                                        {new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date(att.date))}
                                    </td>
                                    <td className="py-3 text-right">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black shadow-sm ${att.status === 'Hadir' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                                            att.status === 'Alpha' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                                                'bg-amber-100 text-amber-700 dark:bg-amber-900/30'
                                            }`}>
                                            {att.status.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="3" className="py-10 text-center text-gray-400">Belum ada data absensi</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentAttendanceDetail;
