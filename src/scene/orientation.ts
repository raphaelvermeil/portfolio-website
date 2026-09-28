import { Quaternion, Vector3 } from 'three';

/** The machine is laid out stacking along +Y; this is that axis before rotation. */
const LOCAL_AXIS = new Vector3(0, 1, 0);

/** How far the machine is turned about the vertical at the start, in radians. */
const START_YAW = -0.7;

/**
 * Where the axis points when the machine is lying down: along +X, so it reads
 * horizontally across the screen before the twist begins.
 */
const LAID_DOWN = new Vector3(1, 0, 0);

/**
 * Orientation the machine starts in: laid flat, then yawed about the vertical.
 *
 * Composing the two is what makes the twist turn about more than one axis. A
 * straight slerp from flat to upright rotates about a single horizontal axis,
 * which reads as a simple tip-up; adding the yaw gives it the corkscrew.
 */
const START = new Quaternion()
  .setFromAxisAngle(LOCAL_AXIS, START_YAW)
  .multiply(new Quaternion().setFromUnitVectors(LOCAL_AXIS, LAID_DOWN));

const UPRIGHT = new Quaternion();

/** Orientation of the whole machine at a given twist progress, 0 flat to 1 upright. */
export function machineQuaternion(progress: number, target = new Quaternion()): Quaternion {
  return target.slerpQuaternions(START, UPRIGHT, Math.min(1, Math.max(0, progress)));
}

/** Direction the machine's axis points in world space at a given twist progress. */
export function machineAxis(progress: number, target = new Vector3()): Vector3 {
  return target.copy(LOCAL_AXIS).applyQuaternion(machineQuaternion(progress, scratch));
}

const scratch = new Quaternion();
