import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { MathUtils, Vector3 } from 'three';
import { useStore } from '../lib/store';
import { partX } from './axisLayout';
import { explode } from './explode';
import { placementById } from './machine';

interface ControlsLike {
  target: Vector3;
}

const FOCUS_OFFSET = 6;
const SMOOTHING = 4;
const SETTLE_EPSILON = 0.05;

interface Props {
  /** Framing distance with the machine closed up. */
  assembledDistance: number;
  /** Framing distance with it fully apart. */
  explodedDistance: number;
}

/**
 * Keeps the machine framed as it comes apart, and eases in on a selected part.
 *
 * With nothing selected the camera tracks the explode, so the assembly fills the
 * frame at either end of the scroll; only its distance is driven, so orbiting
 * still works. Focusing a part is a one-off transition that then settles, leaving
 * the view alone. Runs before drei's OrbitControls update (-1).
 */
export function CameraRig({ assembledDistance, explodedDistance }: Props) {
  const selected = useStore((s) => s.selected);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const gl = useThree((s) => s.gl);
  const target = useMemo(() => new Vector3(), []);
  const desired = useMemo(() => new Vector3(), []);
  const transitioning = useRef(false);

  // OrbitControls sets touch-action:none; allow vertical page scrolling on touch devices.
  useEffect(() => {
    if (controls) gl.domElement.style.touchAction = 'pan-y';
  }, [controls, gl]);

  // Every selection change starts a transition (focus or return home).
  useEffect(() => {
    transitioning.current = true;
  }, [selected]);

  useFrame(({ camera }, dt) => {
    if (!controls) return;
    const p = selected ? placementById[selected] : undefined;
    if (p) target.set(partX(p, explode.current), 0, 0);
    else target.set(0, 0, 0);

    controls.target.x = MathUtils.damp(controls.target.x, target.x, SMOOTHING, dt);
    controls.target.y = MathUtils.damp(controls.target.y, target.y, SMOOTHING, dt);
    controls.target.z = MathUtils.damp(controls.target.z, target.z, SMOOTHING, dt);

    if (p) {
      if (!transitioning.current) return;
      desired.copy(target).normalize().multiplyScalar(target.length() + FOCUS_OFFSET);
    } else {
      const home = assembledDistance + (explodedDistance - assembledDistance) * explode.current;
      desired.copy(camera.position).normalize().multiplyScalar(home);
    }
    camera.position.x = MathUtils.damp(camera.position.x, desired.x, SMOOTHING, dt);
    camera.position.y = MathUtils.damp(camera.position.y, desired.y, SMOOTHING, dt);
    camera.position.z = MathUtils.damp(camera.position.z, desired.z, SMOOTHING, dt);
    if (p && camera.position.distanceTo(desired) < SETTLE_EPSILON) transitioning.current = false;
  }, -2);

  return null;
}
