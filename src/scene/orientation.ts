import { Quaternion, Vector3 } from 'three';

/** The machine is laid out stacking along +Y; this is that axis before rotation. */
const LOCAL_AXIS = new Vector3(0, 1, 0);

/** Lying down, the axis points along +X, reading horizontally across the screen. */
const LAID_DOWN = new Vector3(1, 0, 0);

/**
 * Flat. Turning +Y onto +X is a quarter turn about Z and nothing else, so the
 * machine simply stands up in the plane of the screen — no yaw, no corkscrew.
 */
const START = new Quaternion().setFromUnitVectors(LOCAL_AXIS, LAID_DOWN);

const UPRIGHT = new Quaternion();

/** Orientation of the whole machine at a given twist progress, 0 flat to 1 upright. */
export function machineQuaternion(progress: number, target = new Quaternion()): Quaternion {
  return target.slerpQuaternions(START, UPRIGHT, Math.min(1, Math.max(0, progress)));
}

const scratch = new Quaternion();

/** Direction the machine's axis points in world space at a given twist progress. */
export function machineAxis(progress: number, target = new Vector3()): Vector3 {
  return target.copy(LOCAL_AXIS).applyQuaternion(machineQuaternion(progress, scratch));
}
