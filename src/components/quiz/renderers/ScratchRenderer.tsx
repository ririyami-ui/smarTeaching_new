import React from 'react';
import scratchblocks from 'scratchblocks';

export interface ScratchConfig {
  type: 'scratch';
  code: string;
}

const ScratchRenderer: React.FC<{ config: ScratchConfig }> = ({ config }) => {
  const ref = React.useRef<HTMLPreElement>(null);
  React.useEffect(() => {
    if (ref.current) {
      ref.current.textContent = config.code;
      try {
        scratchblocks.renderMatching(`#${ref.current.id}`, { style: 'scratch3' });
      } catch (e) {
        console.error("Scratch render error", e);
      }
    }
  }, [config.code]);

  const uniqueId = React.useMemo(() => 'scratch-' + Math.random().toString(36).substring(2, 9), []);

  return (
    <div className="my-4 p-4 border-2 border-blue-200 rounded-2xl bg-white flex justify-center overflow-x-auto">
      <pre ref={ref} id={uniqueId} className="scratchcode"></pre>
    </div>
  );
};

export default ScratchRenderer;
