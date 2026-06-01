import React, { useEffect } from 'react';
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
import mermaid from 'mermaid';
import { ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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

interface ChartConfig {
  type: 'line' | 'bar' | 'scatter';
  title: string;
  xLabel?: string;
  yLabel?: string;
  data: Array<{ x: number | string; y: number }>;
  formula?: string;
}

interface MermaidConfig {
  type: 'flowchart' | 'timeline' | 'graph';
  diagram: string;
}

interface ImageConfig {
  description: string;
  position?: 'left' | 'right' | 'center';
  width?: string;
}

interface VisualizationConfig {
  type: 'chart' | 'diagram' | 'image';
  config: ChartConfig | MermaidConfig | ImageConfig | Record<string, unknown>;
}

interface VisualizationRendererProps {
  visualization: VisualizationConfig;
}

const VisualizationRenderer: React.FC<VisualizationRendererProps> = ({ visualization }) => {
  useEffect(() => {
    if (visualization.type === 'diagram') {
      mermaid.contentLoaded();
    }
  }, [visualization]);

  if (visualization.type === 'chart') {
    const chartConfig = visualization.config as ChartConfig;
    
    const chartData = {
      labels: chartConfig.data.map(d => d.x),
      datasets: [{
        label: chartConfig.title,
        data: chartConfig.data.map(d => d.y),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        tension: 0.1,
      }],
    };

    const chartOptions = {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: chartConfig.title,
        },
        legend: {
          display: true,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: chartConfig.xLabel || 'X Axis',
          },
        },
        y: {
          title: {
            display: true,
            text: chartConfig.yLabel || 'Y Axis',
          },
        },
      },
    };

    return (
      <div className="my-4 p-6 border-2 border-blue-200 rounded-2xl bg-white">
        {chartConfig.type === 'line' && <Line data={chartData} options={chartOptions} />}
        {chartConfig.type === 'bar' && <Bar data={chartData} options={chartOptions} />}
        {chartConfig.type === 'scatter' && <Scatter data={chartData} options={chartOptions} />}
      </div>
    );
  }

  if (visualization.type === 'diagram') {
    const mermaidConfig = visualization.config as MermaidConfig;
    return (
      <div className="my-4 p-6 border-2 border-blue-200 rounded-2xl bg-white">
        <div className="mermaid">
          {mermaidConfig.diagram}
        </div>
      </div>
    );
  }

  if (visualization.type === 'image') {
    const imageConfig = visualization.config as ImageConfig;
    return (
      <div className="my-4 p-6 border-2 border-dashed border-blue-200 rounded-2xl flex flex-col items-center justify-center text-center group hover:border-blue-400 transition-colors"
        style={{ width: imageConfig.width || '100%' }}>
        <div className="w-12 h-12 card-glass rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
          <ImageIcon className="text-blue-500" size={24} />
        </div>
        <div className="text-sm font-bold text-blue-700 mb-1">PLACEHOLDER GAMBAR</div>
        <div className="text-xs text-blue-600/70 max-w-md italic leading-relaxed">
          <ReactMarkdown>{imageConfig.description}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return null;
};

export default VisualizationRenderer;
