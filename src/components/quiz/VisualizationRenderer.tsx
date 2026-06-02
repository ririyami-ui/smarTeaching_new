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
import { Mafs, Coordinates, Plot, Point, Text, Theme } from 'mafs';
import 'mafs/core.css';
import mermaid from 'mermaid';
import scratchblocks from 'scratchblocks';
import abcjs from 'abcjs';
import SmiDrawer from 'smiles-drawer';
import wavedrom from 'wavedrom';
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

interface FunctionChartConfig {
  type: 'function';
  expression: string;       // e.g. "-x*x + 4*x + 5"
  title?: string;           // e.g. "h(t) = -t² + 4t + 5"
  xLabel?: string;          // e.g. "Waktu (detik)"
  yLabel?: string;          // e.g. "Ketinggian (cm)"
  xRange?: [number, number]; // e.g. [-1, 5]
  yRange?: [number, number]; // e.g. [-2, 10]
  points?: Array<{ x: number; y: number; label?: string }>;
  color?: string;
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

interface ScratchConfig {
  type: 'scratch';
  code: string;
}

interface LogicConfig {
  type: 'logic';
  code: string; // WaveDrom JSON string
}

interface ChemistryConfig {
  type: 'chemistry';
  smiles: string;
}

interface MusicConfig {
  type: 'music';
  abc: string;
}

interface VisualizationConfig {
  type: 'chart' | 'function' | 'diagram' | 'image' | 'scratch' | 'logic' | 'chemistry' | 'music';
  config: ChartConfig | FunctionChartConfig | MermaidConfig | ImageConfig | ScratchConfig | LogicConfig | ChemistryConfig | MusicConfig | Record<string, unknown>;
}

interface VisualizationRendererProps {
  visualization: VisualizationConfig;
}

// Safely evaluate a math expression string into a JS function
function buildMathFn(expression: string): ((x: number) => number) | null {
  try {
    // Basic sanitization — allow only math-safe characters
    const safe = expression.replace(/[^0-9x+\-*/^().Math\s]/g, '');
    // Replace ^ with ** for exponentiation
    const normalized = safe.replace(/\^/g, '**');
    // eslint-disable-next-line no-new-func
    const fn = new Function('x', `"use strict"; return (${normalized});`) as (x: number) => number;
    // Test it
    const test = fn(1);
    if (typeof test !== 'number' || !isFinite(test)) return null;
    return fn;
  } catch {
    return null;
  }
}

const VisualizationRenderer: React.FC<VisualizationRendererProps> = ({ visualization }) => {
  React.useEffect(() => {
    if (visualization.type === 'diagram') {
      mermaid.contentLoaded();
    }
  }, [visualization]);

  // ── MATHEMATICAL FUNCTION GRAPH (Mafs) ─────────────────────────────────
  if (visualization.type === 'function') {
    const cfg = visualization.config as FunctionChartConfig;
    const mathFn = buildMathFn(cfg.expression);
    const xRange = cfg.xRange ?? [-5, 5];
    const yRange = cfg.yRange ?? [-5, 10];
    const color = cfg.color ?? Theme.blue;

    return (
      <div className="my-4 rounded-2xl border-2 border-blue-200 dark:border-blue-900/50 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
        {cfg.title && (
          <div className="px-4 pt-3 pb-1 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {cfg.title}
          </div>
        )}
        <Mafs
          viewBox={{ x: xRange, y: yRange }}
          height={260}
          preserveAspectRatio={false}
        >
          <Coordinates.Cartesian
            xAxis={{ labels: (n) => String(n), lines: 1 }}
            yAxis={{ labels: (n) => String(n), lines: 1 }}
          />
          {mathFn && (
            <Plot.OfX
              y={mathFn}
              color={color}
              weight={2.5}
            />
          )}
          {cfg.points?.map((pt, i) => (
            <React.Fragment key={i}>
              <Point x={pt.x} y={pt.y} color={Theme.red} />
              {pt.label && (
                <Text x={pt.x + 0.15} y={pt.y + 0.4} size={14}>
                  {pt.label}
                </Text>
              )}
            </React.Fragment>
          ))}
        </Mafs>
        {(cfg.xLabel || cfg.yLabel) && (
          <div className="flex justify-between px-6 pb-2 text-[10px] text-gray-400">
            <span>{cfg.yLabel && `↑ ${cfg.yLabel}`}</span>
            <span>{cfg.xLabel && `${cfg.xLabel} →`}</span>
          </div>
        )}
        {!mathFn && (
          <p className="text-center text-xs text-red-400 pb-2">
            ⚠ Ekspresi fungsi tidak valid: <code>{cfg.expression}</code>
          </p>
        )}
      </div>
    );
  }

  // ── DATA CHART (Chart.js) ───────────────────────────────────────────────
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
        title: { display: true, text: chartConfig.title },
        legend: { display: true },
      },
      scales: {
        x: { title: { display: true, text: chartConfig.xLabel || 'X Axis' } },
        y: { title: { display: true, text: chartConfig.yLabel || 'Y Axis' } },
      },
    };

    return (
      <div className="my-4 p-6 border-2 border-blue-200 rounded-2xl bg-white">
        <div className="mb-4">
          {chartConfig.type === 'line' && <Line data={chartData} options={chartOptions} />}
          {chartConfig.type === 'bar' && <Bar data={chartData} options={chartOptions} />}
          {chartConfig.type === 'scatter' && <Scatter data={chartData} options={chartOptions} />}
        </div>
        
        {/* AUTOMATIC DATA TABLE FOR ANALYSIS */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse border border-gray-200">
            <thead className="bg-blue-50 text-blue-800">
              <tr>
                <th className="p-2 border border-blue-100 text-center">{chartConfig.xLabel || 'X'}</th>
                <th className="p-2 border border-blue-100 text-center">{chartConfig.yLabel || 'Y'}</th>
              </tr>
            </thead>
            <tbody>
              {chartConfig.data.map((row, idx) => (
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
  }

  // ── MERMAID DIAGRAM ─────────────────────────────────────────────────────
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

  // ── IMAGE PLACEHOLDER ───────────────────────────────────────────────────
  if (visualization.type === 'image') {
    const imageConfig = visualization.config as ImageConfig;
    const cleanText = (imageConfig.description || '').trim().replace(/^\[+/, '').replace(/\]+$/, '');
    return (
      <div className="my-2 text-sm text-gray-500 italic">
        [{cleanText}]
      </div>
    );
  }

  // ── SCRATCH BLOCKS ──────────────────────────────────────────────────────
  if (visualization.type === 'scratch') {
    const scratchConfig = visualization.config as ScratchConfig;
    return <ScratchRenderer code={scratchConfig.code} />;
  }

  // ── LOGIC GATES (WaveDrom) ──────────────────────────────────────────────
  if (visualization.type === 'logic') {
    const logicConfig = visualization.config as LogicConfig;
    return <LogicRenderer code={logicConfig.code} />;
  }

  // ── CHEMISTRY (SMILES) ──────────────────────────────────────────────────
  if (visualization.type === 'chemistry') {
    const chemConfig = visualization.config as ChemistryConfig;
    return <ChemistryRenderer smiles={chemConfig.smiles} />;
  }

  // ── MUSIC (ABC Notation) ────────────────────────────────────────────────
  if (visualization.type === 'music') {
    const musicConfig = visualization.config as MusicConfig;
    return <MusicRenderer abc={musicConfig.abc} />;
  }

  return null;
};

// --- Sub-components for new renderers ---

const ScratchRenderer: React.FC<{ code: string }> = ({ code }) => {
  const ref = React.useRef<HTMLPreElement>(null);
  React.useEffect(() => {
    if (ref.current) {
      ref.current.textContent = code;
      try {
        // renderMatching requires a string selector
        scratchblocks.renderMatching(`#${ref.current.id}`, { style: 'scratch3' });
      } catch (e) {
        console.error("Scratch render error", e);
      }
    }
  }, [code]);
  
  // Generate a stable unique ID for this instance
  const uniqueId = React.useMemo(() => 'scratch-' + Math.random().toString(36).substring(2, 9), []);
  
  return (
    <div className="my-4 p-4 border-2 border-blue-200 rounded-2xl bg-white flex justify-center overflow-x-auto">
      <pre ref={ref} id={uniqueId} className="scratchcode"></pre>
    </div>
  );
};

const LogicRenderer: React.FC<{ code: string }> = ({ code }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (ref.current) {
      try {
        const obj = typeof code === 'string' ? JSON.parse(code) : code;
        const id = 'wavedrom-' + Math.random().toString(36).substring(2, 9);
        ref.current.id = id;
        wavedrom.renderWaveForm(id, obj, ref.current);
      } catch (e) {
        console.error("WaveDrom render error", e);
      }
    }
  }, [code]);
  return (
    <div className="my-4 p-4 border-2 border-blue-200 rounded-2xl bg-white flex justify-center overflow-x-auto">
      <div ref={ref}></div>
    </div>
  );
};

const ChemistryRenderer: React.FC<{ smiles: string }> = ({ smiles }) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    if (ref.current) {
      try {
        const drawer = new SmiDrawer({});
        drawer.draw(smiles, ref.current, 'light');
      } catch (e) {
        console.error("SMILES render error", e);
      }
    }
  }, [smiles]);
  return (
    <div className="my-4 p-4 border-2 border-blue-200 rounded-2xl bg-white flex justify-center">
      <canvas ref={ref} width={300} height={300}></canvas>
    </div>
  );
};

const MusicRenderer: React.FC<{ abc: string }> = ({ abc }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (ref.current) {
      try {
        abcjs.renderAbc(ref.current, abc, { responsive: 'resize' });
      } catch (e) {
        console.error("ABCJS render error", e);
      }
    }
  }, [abc]);
  return (
    <div className="my-4 p-4 border-2 border-blue-200 rounded-2xl bg-white overflow-x-auto">
      <div ref={ref}></div>
    </div>
  );
};

export default VisualizationRenderer;

