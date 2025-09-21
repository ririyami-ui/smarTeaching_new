import React from 'react';

const PieChart = ({ data, numDays }) => {
  const colors = {
    Hadir: '#4CAF50', // Green
    Sakit: '#FFC107', // Amber
    Ijin: '#2196F3',  // Blue
    Alpha: '#F44336', // Red
  };

  const total = Object.values(data).reduce((acc, value) => acc + value, 0);

  if (total === 0) {
    return <div className="text-center text-gray-500 py-10">Tidak ada data untuk ditampilkan.</div>;
  }

  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  const slices = Object.entries(data).map(([key, value]) => {
    const percent = value / total;
    const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
    cumulativePercent += percent;
    const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
    const largeArcFlag = percent > 0.5 ? 1 : 0;

    const pathData = [
      `M ${startX * 45} ${startY * 45}`,
      `A 45 45 0 ${largeArcFlag} 1 ${endX * 45} ${endY * 45}`,
      `L ${endX * 25} ${endY * 25}`,
      `A 25 25 0 ${largeArcFlag} 0 ${startX * 25} ${startY * 25}`,
      'Z'
    ].join(' ');

    const average = numDays > 0 ? (value / numDays).toFixed(1) : 0;

    return {
      pathData,
      color: colors[key],
      label: key,
      value: value,
      percent: (percent * 100).toFixed(1),
      average: average
    };
  });

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
      <div className="relative w-64 h-64">
        <svg viewBox="-50 -50 100 100" width="100%" height="100%">
          {slices.map((slice, index) => (
            <path key={index} d={slice.pathData} fill={slice.color} />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-800 dark:text-gray-200">{total}</span>
          <span className="text-md text-gray-500 dark:text-gray-400">Total</span>
        </div>
      </div>
      <div className="w-full lg:w-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-x-6 gap-y-4">
        {slices.map((slice, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }}></div>
            <div className="flex flex-col">
                <span className="font-semibold text-md text-gray-700 dark:text-gray-300">{slice.label}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{slice.percent}% ({slice.average}/hari)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChart;
