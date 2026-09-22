import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { MathUtils, Vector3 } from 'three';
import { useStore } from '../lib/store';
import { placementById } from './machine';

interface ControlsLike {
  target: Vector3;
  update(): void;
}

const HOME_DISTANCE = 16;
const FOCUS_OFFSET = 5;
const SMOOTHING = 4;

export function CameraRig() {
  const selected = useStore((s) => s.selected);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const gl = useThree((s) => s.gl);
  const target = useMemo(() => new Vector3(), []);
  const desired = useMemo(() => new Vector3(), []);

  // OrbitControls sets touch-action:none; allow vertical page scrolling on touch devices.
  useEffect(() => {
    if (controls) gl.domElement.style.touchAction = 'pan-y';
  }, [controls, gl]);

  useFrame(({ camera }, dt) => {
    if (!controls) return;
    const p = selected ? placementById[selected] : undefined;
    if (p) {
      target.set(p.position[0], p.position[1], p.position[2]);
      desired.copy(target).normalize().multiplyScalar(target.length() + FOCUS_OFFSET);
    } else {
      target.set(0, 0, 0);
      desired.copy(camera.position).normalize().multiplyScalar(HOME_DISTANCE);
    }
    controls.target.x = MathUtils.damp(controls.target.x, target.x, SMOOTHING, dt);
    controls.target.y = MathUtils.damp(controls.target.y, target.y, SMOOTHING, dt);
    controls.target.z = MathUtils.damp(controls.target.z, target.z, SMOOTHING, dt);
    camera.position.x = MathUtils.damp(camera.position.x, desired.x, SMOOTHING, dt);
    camera.position.y = MathUtils.damp(camera.position.y, desired.y, SMOOTHING, dt);
    camera.position.z = MathUtils.damp(camera.position.z, desired.z, SMOOTHING, dt);
    controls.update();
  });

  return null;
}
