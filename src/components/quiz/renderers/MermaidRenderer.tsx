import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

// Unique ID generator for mermaid containers
const useId = () => {
  const [id] = React.useState(() => 'mermaid-' + Math.random().toString(36).substr(2, 9));
  return id;
};

const MermaidRenderer: React.FC<{ config: any }> = ({ config }) => {
  const content = config?.diagram || config?.code;
  const containerRef = useRef<HTMLDivElement>(null);
  const elementId = useId();

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, sans-serif',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
        padding: 20
      }
    });
  }, []);

  const sanitizeMermaid = (code: string) => {
    if (!code) return "";
    let sanitized = code;
    // Fix common AI mistake: Node labels with spaces/special chars must be in brackets [ ]
    // This regex looks for patterns like: A --> B (Label) and tries to fix them
    sanitized = sanitized.replace(/(\w+)\s*-->\s*(\w+)\s*\((.*?)\)/g, '$1 --> $2["$3"]');
    // Ensure "graph LR" or similar header exists if missing
    if (!sanitized.trim().startsWith('graph') && !sanitized.trim().startsWith('flowchart') && !sanitized.trim().startsWith('timeline')) {
      sanitized = 'graph LR\n' + sanitized;
    }
    return sanitized;
  };

  useEffect(() => {
    if (content && containerRef.current) {
      const sanitized = sanitizeMermaid(content);
      containerRef.current.innerHTML = sanitized;
      containerRef.current.removeAttribute('data-processed');
      try {
        mermaid.contentLoaded();
      } catch (e) {
        console.error("Mermaid trigger error", e);
      }
    }
  }, [content]);

  if (!content) return null;

  const finalContent = sanitizeMermaid(content);

  return (
    <div className="my-4 p-8 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-3xl bg-white dark:bg-gray-950 flex justify-center overflow-hidden shadow-inner">
      <div 
        ref={containerRef} 
        id={elementId} 
        className="mermaid w-full flex justify-center"
        style={{ minHeight: '150px' }}
      >
        {finalContent}
      </div>
    </div>
  );
};

export default MermaidRenderer;
