import React from 'react';
import mermaid from 'mermaid';

export interface MermaidConfig {
  type: 'flowchart' | 'timeline' | 'graph';
  diagram: string;
}

const MermaidRenderer: React.FC<{ config: MermaidConfig }> = ({ config }) => {
  React.useEffect(() => {
    try {
      mermaid.contentLoaded();
    } catch (e) {
      console.error("Mermaid trigger error", e);
    }
  }, [config.diagram]);

  return (
    <div className="my-4 p-6 border-2 border-blue-200 rounded-2xl bg-white">
      <div className="mermaid">
        {config.diagram}
      </div>
    </div>
  );
};

export default MermaidRenderer;
