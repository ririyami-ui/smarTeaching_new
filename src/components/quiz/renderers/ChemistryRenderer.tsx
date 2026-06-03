import React from 'react';
import SmiDrawer from 'smiles-drawer';

export interface ChemistryConfig {
  type: 'chemistry';
  smiles: string;
}

const ChemistryRenderer: React.FC<{ config: ChemistryConfig }> = ({ config }) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    if (ref.current) {
      try {
        const drawer = new SmiDrawer({});
        drawer.draw(config.smiles, ref.current, 'light');
      } catch (e) {
        console.error("SMILES render error", e);
      }
    }
  }, [config.smiles]);

  return (
    <div className="my-4 p-4 border-2 border-blue-200 rounded-2xl bg-white flex justify-center">
      <canvas ref={ref} width={300} height={300}></canvas>
    </div>
  );
};

export default ChemistryRenderer;
