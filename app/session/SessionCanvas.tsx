'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Trail, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

interface BlsObjectProps {
  pattern: string;
  speed: number;
  size?: number;
  color?: string;
  isActive: boolean;
  trailEnabled?: boolean;
  particlesEnabled?: boolean;
  emotionArousal?: number; // 0-1, for pulsing effect
}

function BlsObject({
  pattern, speed, size = 1.0, color = '#4CAF50', isActive,
  trailEnabled = true, particlesEnabled = true, emotionArousal = 0
}: BlsObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current || !isActive) return;

    const time = state.clock.elapsedTime * speed;
    let x = 0, y = 0, z = 0;

    // Implement ALL 11 patterns from movements.ts
    switch (pattern) {
      case 'horizontal':
        x = Math.sin(time * Math.PI * 2) * 3 * size;
        break;
      case 'infinity':
        x = Math.sin(time * Math.PI * 2) * 3 * size;
        y = Math.sin(time * Math.PI * 4) * 1.5 * size;
        break;
      case 'diagonal':
        x = Math.sin(time * Math.PI * 2) * 2.5 * size;
        y = Math.sin(time * Math.PI * 2) * 1.5 * size;
        break;
      case 'circular':
        x = Math.cos(time * Math.PI * 2) * 2 * size;
        y = Math.sin(time * Math.PI * 2) * 2 * size;
        break;
      case 'butterfly': {
        const bt = time * Math.PI;
        x = Math.sin(bt) * (Math.exp(Math.cos(bt)) - 2 * Math.cos(4 * bt)) * size;
        y = Math.cos(bt) * (Math.exp(Math.cos(bt)) - 2 * Math.cos(4 * bt)) * 0.5 * size;
        break;
      }
      case 'spiral': {
        const radius = (1 + 0.5 * Math.sin(time * 0.5)) * size;
        x = Math.cos(time * Math.PI * 2) * radius * 2;
        y = Math.sin(time * Math.PI * 2) * radius * 2;
        break;
      }
      case 'wave':
        x = Math.sin(time * Math.PI * 2) * 3 * size;
        y = Math.sin(time * Math.PI * 6) * 0.5 * size;
        break;
      case 'lissajous':
        x = Math.sin(time * Math.PI * 2 * 3) * 2.5 * size;
        y = Math.sin(time * Math.PI * 2 * 2) * 2 * size;
        break;
      case 'pendulum': {
        const angle = Math.sin(time * Math.PI * 2) * 0.8;
        const length = 3 * size;
        x = Math.sin(angle) * length;
        y = -Math.cos(angle) * length + length;
        break;
      }
      case 'random_smooth': {
        // Perlin-like smooth random using multiple sin waves
        x = (Math.sin(time * 1.3) + Math.sin(time * 2.7) * 0.5) * 2 * size;
        y = (Math.cos(time * 1.7) + Math.cos(time * 3.1) * 0.5) * 1.5 * size;
        break;
      }
      default:
        x = Math.sin(time * Math.PI * 2) * 3 * size;
    }

    meshRef.current.position.set(x, y, z);

    // Pulsing effect based on emotional arousal
    if (emotionArousal > 0) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * emotionArousal * 0.15;
      meshRef.current.scale.setScalar(pulse);
    }

    // Glow follows main object
    if (glowRef.current) {
      glowRef.current.position.copy(meshRef.current.position);
    }
  });

  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  return (
    <>
      {/* Main BLS object */}
      {trailEnabled ? (
        <Trail
          width={5}
          length={8}
          color={colorObj}
          attenuation={(t) => t * t}
        >
          <mesh ref={meshRef}>
            <sphereGeometry args={[0.3, 32, 32]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              // emissiveIntensity снижена с 0.6 до 0.3 — уменьшает
              // контраст вспышки при движении объекта (WCAG 2.3.1).
              emissiveIntensity={0.3}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        </Trail>
      ) : (
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      )}

      {/* Glow effect */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>

      {/* Particles. Низкая opacity + slow speed чтобы flash rate был <3Hz
          (photosensitive epilepsy, WCAG 2.3.1). При prefers-reduced-motion
          родительский SessionCanvas передаст particlesEnabled=false. */}
      {particlesEnabled && (
        <Sparkles
          count={24}
          scale={size * 5}
          size={1.5}
          speed={0.25}
          opacity={0.2}
          color={color}
        />
      )}

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-5, -5, 5]} intensity={0.3} color={color} />
    </>
  );
}

interface SessionCanvasProps {
  pattern: string;
  speed: number;
  size?: number;
  color?: string;
  isActive: boolean;
  trailEnabled?: boolean;
  particlesEnabled?: boolean;
  emotionArousal?: number;
}

/**
 * Hook: возвращает `true` если пользователь установил `prefers-reduced-motion: reduce`
 * в системе. Используем для BLS чтобы избежать риска фотосенситивного приступа
 * (быстрая ритмичная анимация + flashing — основной триггер).
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return reduced;
}

export default function SessionCanvas({
  pattern, speed, size = 1.0, color = '#4CAF50', isActive,
  trailEnabled = true, particlesEnabled = true, emotionArousal = 0
}: SessionCanvasProps) {
  const reducedMotion = usePrefersReducedMotion();

  // При prefers-reduced-motion:
  //  - убираем Stars (большой контраст flicker)
  //  - отключаем Sparkles/Trail (fast flashing)
  //  - снижаем скорость до 0.5 (визуальный BLS превращается в плавное колыхание,
  //    но клиент всё ещё слышит audio-BLS через Tone.js, который уже adaptive).
  const safeSpeed = reducedMotion ? Math.min(speed, 0.5) : speed;
  const safeTrail = reducedMotion ? false : trailEnabled;
  const safeParticles = reducedMotion ? false : particlesEnabled;

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 60 }}
      gl={{ antialias: !reducedMotion, powerPreference: 'high-performance' }}
      dpr={[1, reducedMotion ? 1.5 : 2]}
    >
      {!reducedMotion && (
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
      )}
      <BlsObject
        pattern={pattern}
        speed={safeSpeed}
        size={size}
        color={color}
        isActive={isActive}
        trailEnabled={safeTrail}
        particlesEnabled={safeParticles}
        emotionArousal={emotionArousal}
      />
      <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
    </Canvas>
  );
}
