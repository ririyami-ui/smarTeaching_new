import React from 'react';

const PieChart = ({ data }) => {
  const categories = [
    { key: 'Hadir', label: 'Hadir', color: 'bg-green-500', barColor: '#22c55e' },
    { key: 'Sakit', label: 'Sakit', color: 'bg-yellow-500', barColor: '#eab308' },
    { key: 'Ijin', label: 'Ijin', color: 'bg-blue-500', barColor: '#3b82f6' },
    { key: 'Alpha', label: 'Alpha', color: 'bg-red-500', barColor: '#ef4444' },
  ];

  const total = categories.reduce((acc, cat) => acc + (data[cat.key] || 0), 0);
  const { schoolDays, studentCount } = data;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 py-10 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
        <span className="text-sm font-medium">Tidak ada data kehadiran</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center gap-4 p-4 h-full">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 mb-2">
        <div className="flex justify-between items-center text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
          <span>Konteks Perhitungan</span>
          <span>{schoolDays || 0} Hari Sekolah</span>
        </div>
        <div className="text-[9px] text-blue-500/70 dark:text-blue-400/50 mt-1">
          *Total Akumulasi = {studentCount || 0} Siswa x {schoolDays || 0} Hari Efektif
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const value = data[cat.key] || 0;
          const percentage = ((value / total) * 100).toFixed(1);
          const avgPerStudent = studentCount > 0 ? (value / studentCount).toFixed(1) : 0;

          return (
            <div key={cat.key} className="space-y-1">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${cat.color}`}></div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{cat.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-medium text-gray-400 italic">Avg: {avgPerStudent} hr/siswa</span>
                  <span className="text-xs font-black text-gray-900 dark:text-gray-100">{value}</span>
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">{percentage}%</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full ${cat.color} rounded-full transition-all duration-1000 ease-out`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Akumulasi</span>
        <span className="text-lg font-black text-gray-800 dark:text-gray-200">{total} <span className="text-xs font-bold text-gray-400">HARI</span></span>
      </div>
    </div>
  );
};

export default PieChart;
