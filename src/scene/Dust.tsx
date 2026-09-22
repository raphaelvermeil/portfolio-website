import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Points } from 'three';
import { useReducedMotion } from '../lib/hooks';
import { mulberry32 } from './layout';

const COUNT = 400;

export function Dust() {
  const ref = useRef<Points>(null);
  const reduced = useReducedMotion();
  const positions = useMemo(() => {
    const rand = mulberry32(7);
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r = 4 + rand() * 9;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((state, dt) => {
    if (!ref.current || reduced) return;
    ref.current.rotation.y += dt * 0.01;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.2;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} sizeAttenuation transparent opacity={0.3} color="#dbe4f0" depthWrite={false} />
    </points>
  );
}
