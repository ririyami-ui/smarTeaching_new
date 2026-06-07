import React from 'react';
import { Line, Bar, Scatter, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export interface ChartConfig {
  type: 'line' | 'bar' | 'scatter' | 'pie' | 'doughnut';
  title: string;
  xLabel?: string;
  yLabel?: string;
  data: Array<{ x: number | string; y: number }>;
  formula?: string;
}

const PRESET_COLORS = [
  'rgba(54, 162, 235, 0.8)',   // Blue
  'rgba(255, 99, 132, 0.8)',   // Pink/Red
  'rgba(255, 206, 86, 0.8)',   // Yellow
  'rgba(75, 192, 192, 0.8)',   // Teal
  'rgba(153, 102, 255, 0.8)',  // Purple
  'rgba(255, 159, 64, 0.8)',   // Orange
  'rgba(74, 222, 128, 0.8)',   // Green
];

const PRESET_BORDERS = [
  'rgb(54, 162, 235)',
  'rgb(255, 99, 132)',
  'rgb(255, 206, 86)',
  'rgb(75, 192, 192)',
  'rgb(153, 102, 255)',
  'rgb(255, 159, 64)',
  'rgb(74, 222, 128)',
];

const ChartRenderer: React.FC<{ config: ChartConfig }> = ({ config }) => {
  // Full null guard: if config is missing or malformed, render nothing
  if (!config || !config.type) return null;

  const isPieOrDoughnut = config.type === 'pie' || config.type === 'doughnut';

  // Guard: ensure data is a valid array
  const safeData = Array.isArray(config.data) ? config.data : [];

  const chartData = {
    labels: safeData.map(d => d.x),
    datasets: [{
      label: config.title,
      data: safeData.map(d => d.y),
      borderColor: isPieOrDoughnut 
        ? safeData.map((_, i) => PRESET_BORDERS[i % PRESET_BORDERS.length])
        : 'rgb(75, 192, 192)',
      backgroundColor: isPieOrDoughnut
        ? safeData.map((_, i) => PRESET_COLORS[i % PRESET_COLORS.length])
        : 'rgba(75, 192, 192, 0.1)',
      tension: 0.1,
      borderWidth: isPieOrDoughnut ? 1 : 2,
    }],
  };


  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: config.title },
      legend: { display: true },
    },
    ...(!isPieOrDoughnut ? {
      scales: {
        x: { title: { display: true, text: config.xLabel || 'X Axis' } },
        y: { title: { display: true, text: config.yLabel || 'Y Axis' } },
      }
    } : {})
  };

  return (
    <div className="my-4 p-6 border-2 border-blue-200 rounded-2xl bg-white">
      <div className="mb-4 relative h-[300px] flex justify-center items-center">
        {config.type === 'line' && <Line data={chartData} options={chartOptions} />}
        {config.type === 'bar' && <Bar data={chartData} options={chartOptions} />}
        {config.type === 'scatter' && <Scatter data={chartData} options={chartOptions} />}
        {config.type === 'pie' && <Pie data={chartData} options={chartOptions} />}
        {config.type === 'doughnut' && <Doughnut data={chartData} options={chartOptions} />}
      </div>
      
      {/* AUTOMATIC DATA TABLE FOR ANALYSIS */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse border border-gray-200">
          <thead className="bg-blue-50 text-blue-800">
            <tr>
              <th className="p-2 border border-blue-100 text-center">{config.xLabel || 'Label'}</th>
              <th className="p-2 border border-blue-100 text-center">{config.yLabel || 'Value'}</th>
            </tr>
          </thead>
          <tbody>
            {safeData.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="p-2 border border-gray-200 text-center">{row.x}</td>
                <td className="p-2 border border-gray-200 text-center">{row.y}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChartRenderer;
