import React from 'react';
import { ShieldAlert, AlertTriangle, Info } from 'lucide-react';

interface Infraction {
  infractionType: string;
}

interface InfractionChartProps {
  infractions: Infraction[];
}

const InfractionChart: React.FC<InfractionChartProps> = ({ infractions }) => {
    // Group infractions by type
    const infractionStats: Record<string, number> = {};
    (infractions || []).forEach(inf => {
        infractionStats[inf.infractionType] = (infractionStats[inf.infractionType] || 0) + 1;
    });

    const total = Object.values(infractionStats).reduce((acc, count) => acc + count, 0);

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 py-10 bg-gray-50 dark:bg-gray-900/20 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                <span className="text-sm font-medium">Tidak ada data pelanggaran</span>
            </div>
        );
    }

    const sortedViolations = Object.entries(infractionStats)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);

    const colors = [
        { bg: 'bg-red-500', bar: '#ef4444', text: 'text-red-600' },
        { bg: 'bg-orange-500', bar: '#f97316', text: 'text-orange-600' },
        { bg: 'bg-amber-500', bar: '#f59e0b', text: 'text-amber-600' },
        { bg: 'bg-rose-500', bar: '#e11d48', text: 'text-rose-600' },
    ];

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600">
                    <ShieldAlert size={24} />
                </div>
                <div>
                    <h2 className="text-lg sm:text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Sebaran Pelanggaran</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Analisis kedisiplinan siswa</p>
                </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-2xl border border-red-100 dark:border-red-800 mb-6">
                <div className="flex justify-between items-center text-[10px] font-black text-red-700 dark:text-red-300 uppercase tracking-widest">
                    <span>Status Kelas</span>
                    <span>{total} Pelanggaran</span>
                </div>
                <div className="text-[10px] font-bold text-red-600/70 dark:text-red-400 mt-1">
                    *Berdasarkan log input perilaku harian
                </div>
            </div>

            <div className="space-y-5 flex-1 overflow-y-auto pr-2 max-h-[350px] scrollbar-thin">
                {sortedViolations.map((violation, idx) => {
                    const color = colors[idx % colors.length];
                    const percentage = ((violation.value / total) * 100).toFixed(1);

                    return (
                        <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-lg ${color.bg} shadow-sm flex items-center justify-center`}>
                                        <AlertTriangle size={14} className="text-white" />
                                    </div>
                                    <span className="text-xs font-black text-gray-800 dark:text-gray-200 truncate max-w-[150px]">
                                        {violation.label}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-black text-gray-900 dark:text-gray-100 mr-2">{violation.value}</span>
                                    <span className="text-md font-black text-gray-800 dark:text-white">{percentage}%</span>
                                </div>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className={`h-full ${color.bg} rounded-full transition-all duration-1000 ease-out`}
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="pt-4 mt-6 border-t border-dashed border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                <div className="flex items-center gap-2">
                    <Info size={14} className="text-gray-400" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Kolektif bskap 046/2025</span>
                </div>
                <span className="text-lg font-black text-gray-800 dark:text-white">{total} <span className="text-[10px] font-bold text-gray-400">DATA</span></span>
            </div>
        </div>
    );
};

export default InfractionChart;
