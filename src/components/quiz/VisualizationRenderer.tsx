import React, { Suspense } from 'react';
import { ImageIcon } from 'lucide-react';

// Lazy load the sub-components to optimize the bundle size
const ChartRenderer = React.lazy(() => import('./renderers/ChartRenderer'));
const MathRenderer = React.lazy(() => import('./renderers/MathRenderer'));
const MermaidRenderer = React.lazy(() => import('./renderers/MermaidRenderer'));
const ScratchRenderer = React.lazy(() => import('./renderers/ScratchRenderer'));
const LogicRenderer = React.lazy(() => import('./renderers/LogicRenderer'));
const ChemistryRenderer = React.lazy(() => import('./renderers/ChemistryRenderer'));
const MusicRenderer = React.lazy(() => import('./renderers/MusicRenderer'));

// Premium skeleton loading fallback
const RenderingSkeleton: React.FC = () => (
  <div className="my-4 p-6 border-2 border-blue-100 dark:border-blue-900/30 rounded-2xl bg-white dark:bg-gray-900 animate-pulse flex flex-col items-center justify-center min-h-[200px] shadow-sm">
    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-3">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-36 mb-2"></div>
    <div className="h-2 bg-gray-100 dark:bg-gray-900 rounded w-24"></div>
  </div>
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
  expression: string;
  title?: string;
  xLabel?: string;
  yLabel?: string;
  xRange?: [number, number];
  yRange?: [number, number];
  points?: Array<{ x: number; y: number; label?: string }>;
  color?: string;
}

interface MermaidConfig {
  type: 'flowchart' | 'diagram' | 'graph';
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
  code: string;
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

const VisualizationRenderer: React.FC<VisualizationRendererProps> = ({ visualization }) => {
  // ── MATHEMATICAL FUNCTION GRAPH (Mafs) ─────────────────────────────────
  if (visualization.type === 'function') {
    const cfg = visualization.config as FunctionChartConfig;
    return (
      <Suspense fallback={<RenderingSkeleton />}>
        <MathRenderer config={cfg} />
      </Suspense>
    );
  }

  // ── DATA CHART (Chart.js) ───────────────────────────────────────────────
  if (visualization.type === 'chart') {
    const cfg = visualization.config as ChartConfig;
    return (
      <Suspense fallback={<RenderingSkeleton />}>
        <ChartRenderer config={cfg} />
      </Suspense>
    );
  }

  // ── MERMAID DIAGRAM ─────────────────────────────────────────────────────
  if (visualization.type === 'diagram') {
    const cfg = visualization.config as MermaidConfig;
    return (
      <Suspense fallback={<RenderingSkeleton />}>
        <MermaidRenderer config={cfg} />
      </Suspense>
    );
  }

  // ── IMAGE PLACEHOLDER ───────────────────────────────────────────────────
  if (visualization.type === 'image') {
    const imageConfig = visualization.config as ImageConfig;
    const cleanText = (imageConfig.description || '').trim().replace(/^\[+/, '').replace(/\]+$/, '');
    return (
      <div className="my-2 text-sm text-gray-500 italic flex items-center gap-1.5">
        <ImageIcon className="w-4 h-4 text-gray-400" />
        <span>[{cleanText}]</span>
      </div>
    );
  }

  // ── SCRATCH BLOCKS ──────────────────────────────────────────────────────
  if (visualization.type === 'scratch') {
    const cfg = visualization.config as ScratchConfig;
    return (
      <Suspense fallback={<RenderingSkeleton />}>
        <ScratchRenderer config={cfg} />
      </Suspense>
    );
  }

  // ── LOGIC GATES (WaveDrom) ──────────────────────────────────────────────
  if (visualization.type === 'logic') {
    const cfg = visualization.config as LogicConfig;
    return (
      <Suspense fallback={<RenderingSkeleton />}>
        <LogicRenderer config={cfg} />
      </Suspense>
    );
  }

  // ── CHEMISTRY (SMILES) ──────────────────────────────────────────────────
  if (visualization.type === 'chemistry') {
    const cfg = visualization.config as ChemistryConfig;
    return (
      <Suspense fallback={<RenderingSkeleton />}>
        <ChemistryRenderer config={cfg} />
      </Suspense>
    );
  }

  // ── MUSIC (ABC Notation) ────────────────────────────────────────────────
  if (visualization.type === 'music') {
    const cfg = visualization.config as MusicConfig;
    return (
      <Suspense fallback={<RenderingSkeleton />}>
        <MusicRenderer config={cfg} />
      </Suspense>
    );
  }

  return null;
};

export default VisualizationRenderer;
