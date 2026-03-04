import React from 'react';
import { Brain } from 'lucide-react';
import RadarChart from './RadarChart';

const StudentRadarProfile = ({ stats }) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Brain size={80} />
            </div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600">
                    <Brain size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">Profil Lulusan 2025</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Holistic Competency Radar</p>
                </div>
            </div>

            <div id="radar-chart-container" className="h-[400px] flex items-center justify-center p-8 mt-4">
                <RadarChart
                    data={stats.radarData}
                    size={340}
                    descriptions={{
                        "Keimanan": "Log Pelanggaran & Catatan Wali Kelas",
                        "Kewargaan": "Persentase Kehadiran & Kedisiplinan",
                        "Penalaran Kritis": "Rata-rata Nilai Pengetahuan",
                        "Kreativitas": "Rata-rata Nilai Keterampilan",
                        "Kolaborasi": "Integrasi Nilai Keterampilan & Proyek",
                        "Kemandirian": "Kemandirian Belajar & Absensi",
                        "Kesehatan": "Data Sakit & Kebugaran Terlacak",
                        "Komunikasi": "Presentasi & Kualitas Tugas Praktik"
                    }}
                />
            </div>

            <div className="mt-4 p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                <p className="text-[10px] text-indigo-800 dark:text-indigo-400 font-medium italic text-center leading-relaxed">
                    *Data dihasilkan secara cerdas melalui konvergensi capaian akademik, rekam kehadiran, dan profil perilaku selama satu semester.
                </p>
            </div>
        </div>
    );
};

export default StudentRadarProfile;
