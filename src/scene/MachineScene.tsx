import { Line, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { TOUCH } from 'three';
import { projectById } from '../lib/data';
import { useMediaQuery, useReducedMotion } from '../lib/hooks';
import { useStore } from '../lib/store';
import { CameraRig } from './CameraRig';
import { Gear } from './Gear';
import { useExplodeOnScroll } from './explode';
import { assembledLength, machineLength, placements, spinDirById } from './machine';
import { BACKGROUND, INK_DIM } from './theme';

/** The camera sits back far enough to frame the whole assembly, viewed three-quarter. */
const VIEW_DIRECTION = [0.3, 0.24, 1] as const;
/** Multiple of the assembly length to stand back by, so it fills most of the frame. */
const FRAMING = 1.9;
/** A long lens flattens perspective, the way a technical illustration is drawn. */
const FOV = 22;

/** Centre line the parts are threaded onto, extending a little past the end parts. */
function Spindle() {
  const half = machineLength / 2 + 0.8;
  return (
    <Line
      points={[
        [-half, 0, 0],
        [half, 0, 0],
      ]}
      color={INK_DIM}
      lineWidth={1}
      transparent
      opacity={0.6}
      toneMapped={false}
    />
  );
}

export function Machine() {
  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always');
  const small = useMediaQuery('(max-width: 600px)');
  const coarse = useMediaQuery('(pointer: coarse)');
  const reduced = useReducedMotion();
  const hasInteracted = useStore((s) => s.hasInteracted);
  const selected = useStore((s) => s.selected);
  const setSelected = useStore((s) => s.setSelected);
  const markInteracted = useStore((s) => s.markInteracted);

  useExplodeOnScroll('.machine');

  useEffect(() => {
    const onVisibility = () => setFrameloop(document.hidden ? 'never' : 'always');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // A narrow viewport sees the machine end-on-ish, so pull back further.
  const framing = small ? FRAMING * 1.35 : FRAMING;
  const distance = machineLength * framing;
  const assembledDistance = Math.max(assembledLength * framing, 8);
  const scale = assembledDistance / Math.hypot(...VIEW_DIRECTION);
  const cameraPosition: [number, number, number] = [
    VIEW_DIRECTION[0] * scale,
    VIEW_DIRECTION[1] * scale,
    VIEW_DIRECTION[2] * scale,
  ];

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={frameloop}
      camera={{ position: cameraPosition, fov: FOV, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onPointerMissed={() => setSelected(null)}
    >
      <color attach="background" args={[BACKGROUND]} />
      <Spindle />
      {placements.map((p) => (
        <Gear key={p.id} placement={p} project={projectById[p.id]} spinDir={spinDirById[p.id] ?? 1} />
      ))}
      <OrbitControls
        makeDefault
        enableZoom={coarse}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        minDistance={6}
        maxDistance={distance * 2}
        autoRotate={!hasInteracted && !reduced && selected === null}
        autoRotateSpeed={0.35}
        touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }}
        onStart={markInteracted}
      />
      <CameraRig assembledDistance={assembledDistance} explodedDistance={distance} />
    </Canvas>
  );
}
