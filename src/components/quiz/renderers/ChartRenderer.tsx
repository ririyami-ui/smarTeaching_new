import React from 'react';
import { Line, Bar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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
  Title,
  Tooltip,
  Legend
);

export interface ChartConfig {
  type: 'line' | 'bar' | 'scatter';
  title: string;
  xLabel?: string;
  yLabel?: string;
  data: Array<{ x: number | string; y: number }>;
  formula?: string;
}

const ChartRenderer: React.FC<{ config: ChartConfig }> = ({ config }) => {
  const chartData = {
    labels: config.data.map(d => d.x),
    datasets: [{
      label: config.title,
      data: config.data.map(d => d.y),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.1)',
      tension: 0.1,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      title: { display: true, text: config.title },
      legend: { display: true },
    },
    scales: {
      x: { title: { display: true, text: config.xLabel || 'X Axis' } },
      y: { title: { display: true, text: config.yLabel || 'Y Axis' } },
    },
  };

  return (
    <div className="my-4 p-6 border-2 border-blue-200 rounded-2xl bg-white">
      <div className="mb-4">
        {config.type === 'line' && <Line data={chartData} options={chartOptions} />}
        {config.type === 'bar' && <Bar data={chartData} options={chartOptions} />}
        {config.type === 'scatter' && <Scatter data={chartData} options={chartOptions} />}
      </div>
      
      {/* AUTOMATIC DATA TABLE FOR ANALYSIS */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse border border-gray-200">
          <thead className="bg-blue-50 text-blue-800">
            <tr>
              <th className="p-2 border border-blue-100 text-center">{config.xLabel || 'X'}</th>
              <th className="p-2 border border-blue-100 text-center">{config.yLabel || 'Y'}</th>
            </tr>
          </thead>
          <tbody>
            {config.data.map((row, idx) => (
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
