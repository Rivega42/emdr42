'use client';

import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';

function EMDRObject({ pattern, speed, isActive }: { pattern: string; speed: number; isActive: boolean }) {
  const meshRef = useRef<any>();

  React.useEffect(() => {
    if (!meshRef.current || !isActive) return;

    const animate = () => {
      const time = Date.now() * 0.001 * speed;
      let x = 0, y = 0;

      switch (pattern) {
        case 'horizontal':
          x = Math.sin(time) * 3;
          y = 0;
          break;
        case 'infinity':
          x = Math.sin(time) * 3;
          y = Math.sin(time * 2) * 1.5;
          break;
        case 'butterfly':
          x = Math.sin(time) * Math.cos(time) * 3;
          y = Math.sin(time) * Math.sin(time) * 2;
          break;
        case 'circular':
          x = Math.cos(time) * 2;
          y = Math.sin(time) * 2;
          break;
      }

      meshRef.current.position.x = x;
      meshRef.current.position.y = y;
    };

    const interval = setInterval(animate, 16);
    return () => clearInterval(interval);
  }, [pattern, speed, isActive]);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial
        color="#4CAF50"
        emissive="#4CAF50"
        emissiveIntensity={0.5}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
}

export default function SessionCanvas({ pattern, speed, isActive }: { pattern: string; speed: number; isActive: boolean }) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
      {isActive && <EMDRObject pattern={pattern} speed={speed} isActive={isActive} />}
      <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
    </Canvas>
  );
}
