import React, { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export interface MindMapConfig {
  nodes: Array<{
    id: string;
    label: string;
    position?: { x: number; y: number };
    type?: string;
    style?: any;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
  }>;
}

interface Props {
  config: MindMapConfig;
}

const MindMapRenderer: React.FC<Props> = ({ config }) => {
  // Transform simplified AI config to React Flow format
  const initialNodes: Node[] = (config.nodes || []).map((n, i) => ({
    id: n.id,
    data: { label: n.label },
    position: n.position || { x: (i % 3) * 200, y: Math.floor(i / 3) * 100 },
    style: n.style || { background: '#e0f2fe', border: '1px solid #38bdf8', borderRadius: '8px', padding: '10px', fontSize: '12px' },
    type: n.type || 'default'
  }));

  const initialEdges: Edge[] = (config.edges || []).map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: true,
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="my-4 w-full h-[400px] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls />
        <MiniMap zoomable pannable />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default MindMapRenderer;
