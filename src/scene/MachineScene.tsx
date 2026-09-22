import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { TOUCH } from 'three';
import { projectById } from '../lib/data';
import { useMediaQuery, useReducedMotion } from '../lib/hooks';
import { useStore } from '../lib/store';
import { CameraRig } from './CameraRig';
import { Dust } from './Dust';
import { Effects } from './Effects';
import { Gear } from './Gear';
import { GridBackdrop } from './GridBackdrop';
import { Links } from './LinksScene';
import { links, placements } from './machine';

const BG = '#0b0f17';

export function Machine() {
  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always');
  const small = useMediaQuery('(max-width: 600px)');
  const coarse = useMediaQuery('(pointer: coarse)');
  const reduced = useReducedMotion();
  const hasInteracted = useStore((s) => s.hasInteracted);
  const selected = useStore((s) => s.selected);
  const setSelected = useStore((s) => s.setSelected);
  const markInteracted = useStore((s) => s.markInteracted);

  useEffect(() => {
    const onVisibility = () => setFrameloop(document.hidden ? 'never' : 'always');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={frameloop}
      camera={{ position: [0, 0, 16], fov: 45, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onPointerMissed={() => setSelected(null)}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 14, 26]} />
      <GridBackdrop />
      {!small && <Dust />}
      {placements.map((p) => (
        <Gear key={p.id} placement={p} project={projectById[p.id]} spinDir={links.spinDir[p.id] ?? 1} />
      ))}
      <Links />
      <OrbitControls
        makeDefault
        enableZoom={coarse}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        minDistance={6}
        maxDistance={24}
        autoRotate={!hasInteracted && !reduced && selected === null}
        autoRotateSpeed={0.4}
        touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }}
        onStart={markInteracted}
      />
      <CameraRig />
      {!small && <Effects />}
    </Canvas>
  );
}
