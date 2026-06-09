import React, { useEffect, useRef, useId } from 'react';
import JXG from 'jsxgraph';
import '../../../../node_modules/jsxgraph/distrib/jsxgraph.css'; // Direct path to fix Vite export issue

export interface FunctionChartConfig {
  type: 'function' | 'geometry';
  expression?: string;
  title?: string;
  xLabel?: string;
  yLabel?: string;
  xRange?: [number, number];
  yRange?: [number, number];
  points?: Array<{ x: number; y: number; label?: string }>;
  elements?: Array<any>;
  color?: string;
}

const MathRenderer: React.FC<{ config: FunctionChartConfig }> = ({ config }) => {
  const containerId = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<any>(null);

  // Sanitasi fungsi - mendukung multi-fungsi dan pertidaksamaan
  const getProcessedFns = (expr: string) => {
    if (!expr) return [];
    
    // Pecah string jika ada kata pemisah
    const parts = expr.split(/\s+dan\s+|,|;/i);
    
    return parts.map(p => {
      try {
        let processed = p
          .replace(/y\s*=\s*/gi, '')
          .replace(/f\(x\)\s*=\s*/gi, '')
          .replace(/[<>]=?|==/g, '-') // Ubah pertidaksamaan jadi pengurangan untuk visualisasi garis
          .replace(/(\d)(x)/g, '$1*$2')
          .replace(/(x)(\d)/g, '$1*$2')
          .replace(/(\))(\()/g, '$1*$2')
          .replace(/(\d)(\()/g, '$1*$2')
          .replace(/(\))([a-zA-Z0-9x])/g, '$1*$2')
          .replace(/[^0-9a-zA-Z+\-*/^().\s]/g, '') 
          .replace(/\^/g, '**');

        processed = processed.replace(/(sin|cos|tan|sqrt|exp|log|abs|pow|PI)/g, 'Math.$1');
        return new Function('x', `return ${processed};`);
      } catch (e) {
        return null;
      }
    }).filter(f => f !== null);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const init = () => {
      if (boardRef.current) {
        try { JXG.JSXGraph.freeBoard(boardRef.current); boardRef.current = null; } catch (e) {}
      }

      // Deteksi skala dari angka dalam rumus
      const numbers = config?.expression?.match(/-?\d+/g)?.map(Number) || [];
      const maxVal = Math.max(...numbers.map(Math.abs), 10);
      
      // Buat range simetris agar 0,0 di tengah jika memungkinkan
      const limit = maxVal > 100 ? maxVal * 1.2 : 10;
      const xRange = config.xRange || [-limit/2, limit];
      const yRange = config.yRange || [-limit/2, limit];

      // Tentukan jarak grid secara dinamis
      const gridDist = maxVal > 1000 ? 1000 : (maxVal > 100 ? 10 : 1);

      try {
        const board = JXG.JSXGraph.initBoard(containerId, {
          boundingbox: [xRange[0], yRange[1], xRange[1], yRange[0]],
          axis: false,
          grid: false, // Matikan grid global agar tidak berantakan
          showCopyright: false,
          showNavigation: false,
          keepaspectratio: true,
          pan: { enabled: false }
        });

        boardRef.current = board;

        // Sumbu X dengan Grid yang Jelas tapi Bersih
        board.create('axis', [[0, 0], [1, 0]], {
          name: 'x',
          withLabel: true,
          label: { position: 'rt', offset: [-15, 20], fontSize: 14, fontWeight: 'bold', color: '#475569' },
          strokeColor: '#334155',
          strokeWidth: 2,
          ticks: { 
            drawZero: true,
            ticksDistance: gridDist,
            majorHeight: 8,
            grid: { 
              strokeColor: '#cbd5e1', 
              strokeOpacity: 0.6, 
              dash: 0 
            },
            label: { fontSize: 10, color: '#64748b', offset: [0, -15] }
          }
        });

        // Sumbu Y dengan Grid yang Jelas tapi Bersih
        board.create('axis', [[0, 0], [0, 1]], {
          name: 'y',
          withLabel: true,
          label: { position: 'rt', offset: [25, -10], fontSize: 14, fontWeight: 'bold', color: '#475569' },
          strokeColor: '#334155',
          strokeWidth: 2,
          ticks: { 
            drawZero: false,
            ticksDistance: gridDist,
            majorHeight: 8,
            grid: { 
              strokeColor: '#cbd5e1', 
              strokeOpacity: 0.6, 
              dash: 0 
            },
            label: { fontSize: 10, color: '#64748b', offset: [-25, 0] }
          }
        });

        // Render Fungsi-Fungsi
        const fns = getProcessedFns(config.expression || "");
        const graphObjects: any[] = []; // Simpan objek grafik untuk referensi tangent/integral
        const palette = [config.color || '#2563eb', '#8b5cf6', '#f43f5e'];
        
        fns.forEach((fn, idx) => {
          const graph = board.create('functiongraph', [fn, xRange[0], xRange[1]], {
            strokeColor: palette[idx % palette.length],
            strokeWidth: 4,
            highlight: false,
            numberPoints: 1000 // Presisi tinggi untuk kalkulus
          });
          graphObjects.push(graph);
        });

        // Render Titik-Titik Penting (Legacy format)
        if (config.points) {
          config.points.forEach((pt) => {
            board.create('point', [pt.x, pt.y], {
              name: pt.label || '',
              size: 4,
              color: '#f43f5e',
              strokeColor: '#ffffff',
              strokeWidth: 3,
              fixed: true,
              label: { offset: [10, 10], fontSize: 12, fontWeight: 'bold', color: '#1e293b' }
            });
          });
        }

        // Render Elemen Geometri Modern (titik, garis, bidang, kalkulus)
        if (config.elements) {
          const elMap = new Map();

          config.elements.forEach((el: any) => {
            try {
              if (el.type === 'point') {
                const p = board.create('point', el.parents, {
                  name: el.label || el.id || '', 
                  size: 4,
                  color: '#f43f5e',
                  strokeColor: '#ffffff',
                  strokeWidth: 2,
                  label: { offset: [10, 10], fontSize: 12, fontWeight: 'bold', color: '#1e293b' }
                });
                if (el.id) elMap.set(el.id, p);
              } else if (el.type === 'segment') {
                const p1 = elMap.get(el.parents[0]) || el.parents[0];
                const p2 = elMap.get(el.parents[1]) || el.parents[1];
                
                board.create('segment', [p1, p2], {
                  name: el.label || '',
                  withLabel: !!el.label,
                  strokeColor: el.color || '#2563eb',
                  strokeWidth: el.strokeWidth || 3,
                  dash: el.dash || 0,
                  label: { position: 'middle', offset: [0, 15], fontSize: 13, fontWeight: 'bold', color: '#0f172a' }
                });
              } else if (el.type === 'integral') {
                // parents: [[x1, x2], function_index]
                const targetGraph = graphObjects[el.parents[1] || 0];
                if (targetGraph) {
                  board.create('integral', [el.parents[0], targetGraph], {
                    fillColor: el.color || '#10b981',
                    fillOpacity: 0.3,
                    label: { visible: false }
                  });
                }
              } else if (el.type === 'tangent') {
                // parents: [point_id, function_index]
                const p = elMap.get(el.parents[0]) || el.parents[0];
                const targetGraph = graphObjects[el.parents[1] || 0];
                if (p && targetGraph) {
                  board.create('tangent', [p, targetGraph], {
                    strokeColor: el.color || '#f43f5e',
                    strokeWidth: 2,
                    dash: 2
                  });
                }
              } else if (el.type === 'polygon') {
                const vertices = el.parents.map((id: string) => elMap.get(id) || id);
                board.create('polygon', vertices, {
                  fillColor: el.color || '#3b82f6',
                  fillOpacity: 0.1,
                  borders: { strokeWidth: 1 }
                });
              }
            } catch (e) {
              console.warn("Element creation failed:", el, e);
            }
          });
        }
      } catch (err) {
        console.error("Board init fail:", err);
      }
    };

    // Jeda sedikit agar container siap di DOM
    const timer = setTimeout(init, 100);

    return () => {
      clearTimeout(timer);
      if (boardRef.current) {
        try {
          JXG.JSXGraph.freeBoard(boardRef.current);
          boardRef.current = null;
        } catch (e) {}
      }
    };
  }, [config, containerId]);

  return (
    <div className="my-10 rounded-[2.5rem] border-4 border-slate-50 overflow-hidden bg-white shadow-2xl p-1 transition-all hover:shadow-blue-900/10">
      {/* Header Info */}
      <div className="bg-white px-8 py-6 flex justify-between items-center border-b border-slate-50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-1.5 w-6 bg-blue-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matematika Modern</span>
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">
            {config.title || 'Visualisasi Grafik Fungsi'}
          </h3>
          <p className="text-sm text-slate-400 mt-2 font-medium">
            Model: <span className="text-blue-600 font-bold">{config.expression}</span>
          </p>
        </div>
      </div>

      {/* Main Graph Area */}
      <div 
        id={containerId} 
        ref={containerRef} 
        className="jxgbox w-full bg-white" 
        style={{ height: '450px', border: 'none' }}
      ></div>

      {/* Footer / Legend */}
      <div className="bg-slate-50/50 px-8 py-4 flex justify-between items-center border-t border-slate-100">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Fungsi Utama</span>
           </div>
           {config?.expression && config.expression.toLowerCase().includes('dan') && (
             <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Fungsi Kedua</span>
             </div>
           )}
        </div>
        <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
           Sistem Koordinat Kartesius 2D
        </div>
      </div>
    </div>
  );
};

export default MathRenderer;
