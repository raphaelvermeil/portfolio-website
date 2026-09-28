import { Line } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { projectById } from '../lib/data';
import { useMediaQuery } from '../lib/hooks';
import { useStore } from '../lib/store';
import { ScrollCamera } from './ScrollCamera';
import { SkillCallouts } from './SkillCallouts';
import { Gear } from './Gear';
import { Quaternion, type Group } from 'three';
import { CAMERA_PATH, cameraAt, posePosition } from './cameraPath';
import { machineQuaternion } from './orientation';
import { actProgress, stage, useScrollStage } from './timeline';
import { assembledLength, machineDiameter, machineLength, motionById, placements } from './machine';
import { BACKGROUND, INK_DIM } from './theme';

/** Multiple of the assembly length to stand back by, so it fills most of the frame. */
/** Room left around the machine once it is fitted to the frame. */
const MARGIN = 1.14;
/** A long lens flattens perspective, the way a technical illustration is drawn. */
const FOV = 22;

/**
 * Turns the whole machine from lying flat to standing upright as the twist act
 * runs. Everything in the scene rides inside this, so the parts, the spindle
 * and the callouts all stay locked together through the move.
 */
function MachineRoot({ children }: { children: ReactNode }) {
  const root = useRef<Group>(null);
  const rotation = useMemo(() => new Quaternion(), []);

  useFrame(() => {
    if (root.current) {
      root.current.quaternion.copy(machineQuaternion(actProgress(stage.current, 'upright'), rotation));
    }
  });

  return <group ref={root}>{children}</group>;
}

/** Centre line the parts are threaded onto, extending a little past the end parts. */
function Spindle() {
  const half = machineLength / 2 + 0.8;
  return (
    <Line
      points={[
        [0, -half, 0],
        [0, half, 0],
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

  useScrollStage('.machine', markInteracted);

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
      <MachineRoot>
        <Spindle />
        {placements.map((p) => (
          <Gear key={p.id} placement={p} project={projectById[p.id]} motion={motionById[p.id]} />
        ))}
        <SkillCallouts />
      </MachineRoot>
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
