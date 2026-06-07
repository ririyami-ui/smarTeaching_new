import React, { useEffect, useRef } from 'react';

export interface GeometryConfig {
  board?: any;
  elements?: any[];
}

interface Props {
  config: GeometryConfig;
}

const GeometryRenderer: React.FC<Props> = ({ config }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let board: any = null;
    let JXG_ref: any = null;
    let mounted = true;

    const initGraph = async () => {
      // Import first, then check if still mounted (prevents null ref race condition)
      const JXG = (await import('jsxgraph')).default;
      JXG_ref = JXG;

      if (!mounted || !containerRef.current) return;

      // Ensure CSS is loaded
      if (!document.getElementById('jsxgraph-css')) {
        const link = document.createElement('link');
        link.id = 'jsxgraph-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/jsxgraph/distrib/jsxgraph.css';
        document.head.appendChild(link);

        const style = document.createElement('style');
        style.innerHTML = `
          .jxgbox .jxg-label { color: black !important; font-weight: bold !important; background: rgba(255,255,255,0.7); padding: 2px; }
          .jxgbox .jxg-text { color: black !important; }
        `;
        document.head.appendChild(style);
      }

      // Set unique ID on the container
      const id = `jxgbox-${Math.random().toString(36).substr(2, 9)}`;
      containerRef.current.id = id;

      try {
        const boardOptions = {
          boundingbox: config.board?.boundingbox || [-2, 10, 10, -2],
          axis: true,
          grid: true,
          showNavigation: false,
          showCopyright: false,
          ...config.board,
        };

        board = JXG.JSXGraph.initBoard(id, boardOptions);

        if (config.elements && Array.isArray(config.elements)) {
          const elementsMap: Record<string, any> = {};

          // Map invalid AI-generated types to valid JSXGraph equivalents
          const typeAliases: Record<string, string> = {
            cube: 'polygon',
            rectangle: 'polygon',
            trapezoid: 'polygon',
            rhombus: 'polygon',
            parallelogram: 'polygon',
            line: 'segment',
          };

          // Sort: points first, then segments, then polygons
          const typeOrder: Record<string, number> = {
            axis: 1, point: 2, segment: 3, circle: 3, polygon: 4, text: 5,
          };

          const sortedElements = [...config.elements]
            .map(el => ({ ...el, type: typeAliases[el.type] || el.type }))
            .sort((a, b) => (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99));

          sortedElements.forEach(el => {
            let parents = el.parents || el.coords || [];

            // Resolve string IDs to actual JSXGraph objects
            if (Array.isArray(parents)) {
              let hasMissingParents = false;
              parents = parents.map(p => {
                if (typeof p !== 'string') return p;
                const resolved =
                  elementsMap[p] ||
                  Object.values(elementsMap).find((o: any) => o.name === p);
                
                if (!resolved) hasMissingParents = true;
                return resolved || p;
              });

              // FIX CRASH: Prevent creating segments/lines if parent points are missing
              if (hasMissingParents && el.type !== 'point') {
                console.warn(`[GeometryRenderer] Skipping ${el.type} because parents are missing.`);
                return; // Skip this element to avoid 'usrCoords' crash
              }
            }

            // SMART LABEL: Use id if name is missing (A, B, C...)
            const labelName = el.properties?.name || (typeof el.id === 'string' ? el.id : '');
            const hasLabel = !!labelName;

            const props = {
              name: labelName,
              withLabel: hasLabel,
              strokeColor: el.type === 'point' ? '#e67e22' : '#3b82f6',
              strokeWidth: el.type === 'point' ? 2 : 3,
              label: {
                visible: hasLabel,
                autoPosition: true,
                fontSize: 14,
                fontWeight: 'bold',
                strokeColor: 'black',
                cssClass: 'jxg-label',
              },
              ...el.properties,
            };

            try {
              const created = board.create(el.type, parents, props);
              const refId = el.id || labelName;
              if (refId) elementsMap[refId] = created;

              // AUTO-HEAL: polygon → auto-draw all sides without labels
              if (el.type === 'polygon' && Array.isArray(parents)) {
                for (let i = 0; i < parents.length; i++) {
                  const p1 = parents[i];
                  const p2 = parents[(i + 1) % parents.length];
                  board.create('segment', [p1, p2], {
                    strokeColor: el.properties?.strokeColor || '#3b82f6',
                    strokeWidth: 2,
                    withLabel: false,
                    fixed: true,
                  });
                }
              }
            } catch (err) {
              console.warn(`Failed to create JSXGraph element ${el.type}:`, err);
            }
          });
        }
      } catch (e) {
        console.error('JSXGraph board error:', e);
      }
    };

    initGraph();

    return () => {
      mounted = false;
      if (board && JXG_ref) {
        try { JXG_ref.JSXGraph.freeBoard(board); } catch (_) {}
      }
    };
  }, [config]);

  return (
    <div className="my-4 flex flex-col items-center justify-center w-full">
      <div
        ref={containerRef}
        className="jxgbox rounded-xl border border-gray-200 dark:border-gray-700 bg-white shadow-sm"
        style={{ width: '100%', maxWidth: '600px', height: '400px' }}
      />
    </div>
  );
};

export default GeometryRenderer;
