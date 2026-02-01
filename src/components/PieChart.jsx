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
    <div className="flex flex-col justify-start gap-4 p-2 h-full overflow-hidden">
      <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl border border-blue-200 dark:border-blue-800 mt-2 mb-2">
        <div className="flex justify-between items-center text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">
          <span>Konteks Perhitungan</span>
          <span>{schoolDays || 0} Hari Sekolah</span>
        </div>
        <div className="text-[10px] font-bold text-blue-600/80 dark:text-blue-400 mt-1">
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
                  <div className={`w-2.5 h-2.5 rounded-full ${cat.color} shadow-sm`}></div>
                  <span className="text-xs font-black text-gray-800 dark:text-gray-200">{cat.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-bold text-gray-500 italic">Avg: {avgPerStudent} hr/siswa</span>
                  <span className="text-sm font-black text-gray-900 dark:text-gray-100">{value}</span>
                  <span className="text-sm font-black text-blue-700 dark:text-blue-400">{percentage}%</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className={`h-full ${cat.color} rounded-full transition-all duration-1000 ease-out`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t-2 border-gray-100 dark:border-gray-800 flex justify-between items-center">
        <span className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Akumulasi</span>
        <span className="text-xl font-black text-gray-900 dark:text-gray-100">{total} <span className="text-xs font-bold text-gray-500">HARI</span></span>
      </div>
    </div>
  );
};

export default PieChart;
