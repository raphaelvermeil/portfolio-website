import { Line } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { projectById } from '../lib/data';
import { useMediaQuery } from '../lib/hooks';
import { useStore } from '../lib/store';
import { ScrollCamera } from './ScrollCamera';
import { Gear } from './Gear';
import { CAMERA_PATH, cameraAt, posePosition } from './cameraPath';
import { useExplodeOnScroll } from './explode';
import { assembledLength, machineDiameter, machineLength, motionById, placements } from './machine';
import { BACKGROUND, INK_DIM } from './theme';

/** Multiple of the assembly length to stand back by, so it fills most of the frame. */
/** Room left around the machine once it is fitted to the frame. */
const MARGIN = 1.14;
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
  const setSelected = useStore((s) => s.setSelected);
  const markInteracted = useStore((s) => s.markInteracted);

  useExplodeOnScroll('.machine', markInteracted);

  useEffect(() => {
    const onVisibility = () => setFrameloop(document.hidden ? 'never' : 'always');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // A narrow viewport has less room around the subject, so leave a little more.
  const margin = small ? MARGIN * 1.25 : MARGIN;
  const cameraPosition = posePosition(cameraAt(CAMERA_PATH, 0), assembledLength * 1.9);

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
        <Gear key={p.id} placement={p} project={projectById[p.id]} motion={motionById[p.id]} />
      ))}

      <ScrollCamera
        assembledLength={assembledLength}
        explodedLength={machineLength}
        diameter={machineDiameter}
        fov={FOV}
        margin={margin}
      />
    </Canvas>
  );
}
