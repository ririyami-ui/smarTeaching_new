import React from 'react';
import { Mafs, Coordinates, Plot, Point, Text, Theme } from 'mafs';
import 'mafs/core.css';

export interface FunctionChartConfig {
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

// Safely evaluate a math expression string into a JS function
function buildMathFn(expression: string): ((x: number) => number) | null {
  try {
    const safe = expression.replace(/[^0-9x+\-*/^().Math\s]/g, '');
    const normalized = safe.replace(/\^/g, '**');
    // eslint-disable-next-line no-new-func
    const fn = new Function('x', `"use strict"; return (${normalized});`) as (x: number) => number;
    const test = fn(1);
    if (typeof test !== 'number' || !isFinite(test)) return null;
    return fn;
  } catch {
    return null;
  }
}

const MathRenderer: React.FC<{ config: FunctionChartConfig }> = ({ config }) => {
  const mathFn = buildMathFn(config.expression);
  const xRange = config.xRange ?? [-5, 5];
  const yRange = config.yRange ?? [-5, 10];
  const color = config.color ?? Theme.blue;

  const getStepSize = (range: [number, number]) => {
    const diff = Math.abs(range[1] - range[0]);
    if (diff <= 2) return 0.5;
    if (diff <= 5) return 1;
    if (diff <= 10) return 2;
    if (diff <= 25) return 5;
    if (diff <= 50) return 10;
    if (diff <= 100) return 20;
    if (diff <= 250) return 50;
    return Math.ceil(diff / 5);
  };

  const xStep = getStepSize(xRange);
  const yStep = getStepSize(yRange);

  return (
    <div className="my-4 rounded-2xl border-2 border-blue-200 dark:border-blue-900/50 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
      {config.title && (
        <div className="px-4 pt-3 pb-1 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
          {config.title}
        </div>
      )}
      <Mafs
        viewBox={{ x: xRange, y: yRange }}
        height={260}
        preserveAspectRatio={false}
      >
        <Coordinates.Cartesian
          xAxis={{ labels: (n) => String(Math.round(n * 10) / 10), lines: xStep }}
          yAxis={{ labels: (n) => String(Math.round(n * 10) / 10), lines: yStep }}
        />
        {mathFn && (
          <Plot.OfX
            y={mathFn}
            color={color}
            weight={2.5}
          />
        )}
        {config.points?.map((pt, i) => (
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
      {(config.xLabel || config.yLabel) && (
        <div className="flex justify-between px-6 pb-2 text-[10px] text-gray-400">
          <span>{config.yLabel && `↑ ${config.yLabel}`}</span>
          <span>{config.xLabel && `${config.xLabel} →`}</span>
        </div>
      )}
      {!mathFn && (
        <p className="text-center text-xs text-red-400 pb-2">
          ⚠ Ekspresi fungsi tidak valid: <code>{config.expression}</code>
        </p>
      )}
    </div>
  );
};

export default MathRenderer;
