import React from 'react';
import wavedrom from 'wavedrom';

export interface LogicConfig {
  type: 'logic';
  code: string; // WaveDrom JSON string
}

const LogicRenderer: React.FC<{ config: LogicConfig }> = ({ config }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (ref.current) {
      try {
        const obj = typeof config.code === 'string' ? JSON.parse(config.code) : config.code;
        const id = 'wavedrom-' + Math.random().toString(36).substring(2, 9);
        ref.current.id = id;
        wavedrom.renderWaveForm(id, obj, ref.current);
      } catch (e) {
        console.error("WaveDrom render error", e);
      }
    }
  }, [config.code]);

  return (
    <div className="my-4 p-4 border-2 border-blue-200 rounded-2xl bg-white flex justify-center overflow-x-auto">
      <div ref={ref}></div>
    </div>
  );
};

export default LogicRenderer;
