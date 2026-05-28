import React from 'react';
import { Calendar, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import { StudentStats, AttendanceRecord } from '../types/studentTypes';
import { formatDate } from '../utils/dateUtils';

// Helper native untuk memformat tanggal ke Bahasa Indonesia secara konsisten tanpa dependensi external
const formatTanggalIndonesia = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        return formatDate(date, 'id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'short'
        });
    } catch {
        return dateStr;
    }
};

// Helper native untuk menghitung waktu relatif dalam Bahasa Indonesia yang 100% akurat
const formatWaktuRelatifIndonesia = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        
        const now = new Date();
        
        // Normalisasi jam ke 00:00 untuk menghindari perbedaan jam kecil
        const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const diffTime = d2.getTime() - d1.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) return 'HARI INI';
        if (diffDays === 1) return 'KEMARIN';
        if (diffDays < 30) return `${diffDays} HARI YANG LALU`;
        
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths === 1) return 'SEBULAN YANG LALU';
        if (diffMonths < 12) return `${diffMonths} BULAN YANG LALU`;
        
        const diffYears = Math.floor(diffMonths / 12);
        if (diffYears === 1) return 'SETAHUN YANG LALU';
        return `${diffYears} TAHUN YANG LALU`;
    } catch {
        return '';
    }
};

interface StudentAttendanceDetailProps {
    stats: StudentStats;
    attendance: AttendanceRecord[];
}

const StudentAttendanceDetail: React.FC<StudentAttendanceDetailProps> = ({ stats, attendance }) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600">
                    <Calendar size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Trend Kehadiran</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/20">
                    <p className="text-[11px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Hadir</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300">{stats.attendance.Hadir}</p>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/20">
                    <p className="text-[11px] sm:text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Sakit</p>
                    <p className="text-lg sm:text-xl font-black text-blue-700 dark:text-blue-300">{stats.attendance.Sakit}</p>
                </div>
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/20">
                    <p className="text-[11px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">Ijin</p>
                    <p className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-300">{stats.attendance.Ijin}</p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800/20">
                    <p className="text-[11px] sm:text-[10px] font-bold text-red-600 dark:text-red-400 uppercase mb-1">Alpha</p>
                    <p className="text-lg sm:text-xl font-black text-red-700 dark:text-red-300">{stats.attendance.Alpha}</p>
                </div>
            </div>

            <div className="flex-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                <div className="space-y-3">
                    {attendance.length > 0 ? attendance.map((record, i) => {
                        let Icon = CheckCircle2;
                        let colorClass = "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20";
                        const statusNormal = (record.status || '').trim().toLowerCase();
                        if (statusNormal === 'sakit') { Icon = Clock; colorClass = "text-blue-500 bg-blue-50 dark:bg-blue-900/20"; }
                        if (statusNormal === 'ijin' || statusNormal === 'izin') { Icon = AlertCircle; colorClass = "text-amber-500 bg-amber-50 dark:bg-amber-900/20"; }
                        if (statusNormal === 'alpha') { Icon = XCircle; colorClass = "text-red-500 bg-red-50 dark:bg-red-900/20"; }

                        return (
                            <div key={i} className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${colorClass}`}>
                                        <Icon size={16} />
                                    </div>
                                    <div>
                                        {/* Memanggil format tanggal native Indonesia */}
                                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 capitalize">{formatTanggalIndonesia(record.date)}</p>
                                        <p className="text-[10px] text-gray-400">{record.status}</p>
                                    </div>
                                </div>
                                {/* Memanggil format waktu relatif native Indonesia */}
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    {formatWaktuRelatifIndonesia(record.date)}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="py-10 text-center text-gray-400 italic text-sm">Belum ada rekam kehadiran</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentAttendanceDetail;
