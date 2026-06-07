import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Sphere, Cylinder, Text } from '@react-three/drei';

export interface Model3DConfig {
  shapes: Array<{
    type: 'box' | 'sphere' | 'cylinder';
    position?: [number, number, number];
    args?: any[];
    color?: string;
    label?: string;
  }>;
}

interface Props {
  config: Model3DConfig;
}

const Model3DRenderer: React.FC<Props> = ({ config }) => {
  return (
    <div className="my-4 w-full h-[400px] bg-gray-900 rounded-xl overflow-hidden relative border border-gray-700 shadow-inner">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Suspense fallback={null}>
          {config.shapes?.map((shape, idx) => {
            const pos = shape.position || [0, 0, 0];
            const color = shape.color || 'hotpink';
            
            return (
              <group key={idx} position={pos}>
                {shape.type === 'box' && <Box args={shape.args as any || [1, 1, 1]}><meshStandardMaterial color={color} /></Box>}
                {shape.type === 'sphere' && <Sphere args={shape.args as any || [0.5, 32, 32]}><meshStandardMaterial color={color} /></Sphere>}
                {shape.type === 'cylinder' && <Cylinder args={shape.args as any || [0.5, 0.5, 1, 32]}><meshStandardMaterial color={color} /></Cylinder>}
                
                {shape.label && (
                  <Text position={[0, (shape.args?.[1] || 1) + 0.5, 0]} fontSize={0.2} color="white">
                    {shape.label}
                  </Text>
                )}
              </group>
            );
          })}
        </Suspense>
        <OrbitControls makeDefault />
      </Canvas>
      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur">
        Gunakan sentuhan/mouse untuk memutar 3D
      </div>
    </div>
  );
};

export default Model3DRenderer;
