import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { MathUtils, Vector3 } from 'three';
import { useStore } from '../lib/store';
import { placementById } from './machine';

interface ControlsLike {
  target: Vector3;
}

const HOME_DISTANCE = 16;
const FOCUS_OFFSET = 5;
const SMOOTHING = 4;
const SETTLE_EPSILON = 0.05;

/**
 * Eases the orbit target and camera between the home view and a selected gear.
 * The camera position is only driven while a transition is in progress, so user
 * zoom/orbit persists once settled. Runs before drei's OrbitControls update (-1).
 */
export function CameraRig() {
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
    if (p) target.set(p.position[0], p.position[1], p.position[2]);
    else target.set(0, 0, 0);

    controls.target.x = MathUtils.damp(controls.target.x, target.x, SMOOTHING, dt);
    controls.target.y = MathUtils.damp(controls.target.y, target.y, SMOOTHING, dt);
    controls.target.z = MathUtils.damp(controls.target.z, target.z, SMOOTHING, dt);

    if (!transitioning.current) return;
    if (p) desired.copy(target).normalize().multiplyScalar(target.length() + FOCUS_OFFSET);
    else desired.copy(camera.position).normalize().multiplyScalar(HOME_DISTANCE);
    camera.position.x = MathUtils.damp(camera.position.x, desired.x, SMOOTHING, dt);
    camera.position.y = MathUtils.damp(camera.position.y, desired.y, SMOOTHING, dt);
    camera.position.z = MathUtils.damp(camera.position.z, desired.z, SMOOTHING, dt);
    if (camera.position.distanceTo(desired) < SETTLE_EPSILON) transitioning.current = false;
  }, -2);

  return null;
}
