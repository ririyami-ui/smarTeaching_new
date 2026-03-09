import React from 'react';
import { PieChart as PieChartIcon, UserCheck, Stethoscope, DoorOpen, UserX } from 'lucide-react';

const PieChart = ({ data }) => {
  const categories = [
    { key: 'Hadir', label: 'Hadir', color: 'bg-green-500', barColor: '#22c55e', icon: <UserCheck size={14} className="text-white" /> },
    { key: 'Sakit', label: 'Sakit', color: 'bg-yellow-500', barColor: '#eab308', icon: <Stethoscope size={14} className="text-white" /> },
    { key: 'Ijin', label: 'Ijin', color: 'bg-blue-500', barColor: '#3b82f6', icon: <DoorOpen size={14} className="text-white" /> },
    { key: 'Alpha', label: 'Alpha', color: 'bg-red-500', barColor: '#ef4444', icon: <UserX size={14} className="text-white" /> },
  ];

  const total = categories.reduce((acc, cat) => acc + (data[cat.key] || 0), 0);
  const { schoolDays, studentCount } = data;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 py-10 bg-gray-50 dark:bg-gray-900/20 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
        <span className="text-sm font-medium">Tidak ada data kehadiran</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 h-full flex flex-col min-w-[280px]">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 shrink-0">
          <PieChartIcon size={20} />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-black text-gray-800 dark:text-white uppercase tracking-tight leading-tight">Statistik Kehadiran</h2>
          <p className="text-[10px] text-gray-400 mt-0.5">Ringkasan presensi semester ini</p>
        </div>
      </div>

      <div className="bg-blue-50/30 dark:bg-blue-900/15 p-3.5 rounded-2xl border border-blue-100/50 dark:border-blue-800/30 mb-6 font-mono">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[9px] font-black text-blue-700/50 dark:text-blue-300/50 uppercase tracking-widest">Konteks</span>
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-300 px-2 py-0.5 bg-white dark:bg-gray-800 rounded-md border border-blue-100/50">{schoolDays || 0} Hari</span>
        </div>
        <div className="text-[9px] font-bold text-blue-500/80 dark:text-blue-400">
          {studentCount || 0} Siswa <span className="opacity-30">×</span> {schoolDays || 0} Hari Efektif
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {categories.map((cat) => {
          const value = data[cat.key] || 0;
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

          return (
            <div key={cat.key} className="group">
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg ${cat.color} shadow-sm flex items-center justify-center shrink-0`}>
                    {cat.icon}
                  </div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{cat.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-black text-gray-900 dark:text-gray-100">{value}</span>
                  <span className={`text-[10px] font-black min-w-[3.5rem] text-right ${percentage > 0 ? 'text-gray-500' : 'text-gray-300'}`}>
                    {percentage}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full ${cat.color} rounded-full transition-all duration-1000 ease-out`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 mt-6 border-t border-dashed border-gray-100 dark:border-gray-700/50 flex justify-between items-center px-1">
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Record</span>
        <div className="flex items-baseline gap-1">
          <span className="text-base font-black text-gray-800 dark:text-white">{total}</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase">Log</span>
        </div>
      </div>
    </div>
  );
};

export default PieChart;
