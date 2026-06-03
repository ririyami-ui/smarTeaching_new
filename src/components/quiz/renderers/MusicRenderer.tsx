import React from 'react';
import abcjs from 'abcjs';

export interface MusicConfig {
  type: 'music';
  abc: string;
}

const MusicRenderer: React.FC<{ config: MusicConfig }> = ({ config }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (ref.current) {
      try {
        abcjs.renderAbc(ref.current, config.abc, { responsive: 'resize' });
      } catch (e) {
        console.error("ABCJS render error", e);
      }
    }
  }, [config.abc]);

  return (
    <div className="my-4 p-4 border-2 border-blue-200 rounded-2xl bg-white overflow-x-auto">
      <div ref={ref}></div>
    </div>
  );
};

export default MusicRenderer;
