export interface CameraKey {
  /** Scroll progress this pose belongs to, 0 to 1. */
  at: number;
  /** Rotation about the vertical, in degrees. 0 looks at the machine broadside; 90 looks straight down its axis. */
  azimuth: number;
  /** Height above the machine's plane, in degrees. */
  elevation: number;
  /** Multiplier on the framing distance, for pushing in or pulling back. */
  distance: number;
}

export interface CameraPose {
  azimuth: number;
  elevation: number;
  distance: number;
}

/**
 * The shot list, in step with the acts in timeline.ts.
 *
 * Only one thing moves at a time.
 *
 * The camera opens low and almost level, drifts a little while the machine
 * comes apart, then holds perfectly still for the twist — so standing the
 * machine up reads as a single rotation and nothing else. Once it is upright
 * the camera rises, alone, to look down into the stack, arriving just as the
 * labelled parts step off the axis. Neither angle ever runs backwards.
 */
export const CAMERA_PATH: CameraKey[] = [
  { at: 0, azimuth: -20, elevation: 8, distance: 1 },
  { at: 0.22, azimuth: -14, elevation: 8, distance: 1 },
  // Held identical through the reveal: the brain turns, the camera does not.
  { at: 0.42, azimuth: -14, elevation: 8, distance: 1 },
  { at: 0.66, azimuth: 2, elevation: 58, distance: 1 },
  { at: 1, azimuth: 42, elevation: 64, distance: 1 },
];

/** Eases the joins so the camera arrives and leaves each pose gently. */
function smoothstep(x: number): number {
  return x * x * (3 - 2 * x);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The camera pose at a given scroll progress. */
export function cameraAt(path: CameraKey[], progress: number): CameraPose {
  if (path.length === 0) return { azimuth: 0, elevation: 0, distance: 1 };
  const p = Math.min(1, Math.max(0, progress));

  let i = 0;
  while (i < path.length - 2 && p > path[i + 1].at) i++;

  const from = path[i];
  const to = path[i + 1] ?? from;
  const span = to.at - from.at;
  const t = span <= 0 ? 0 : smoothstep(Math.min(1, Math.max(0, (p - from.at) / span)));

  return {
    azimuth: lerp(from.azimuth, to.azimuth, t),
    elevation: lerp(from.elevation, to.elevation, t),
    distance: lerp(from.distance, to.distance, t),
  };
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Distance needed to fit the machine on screen from a given pose.
 *
 * The assembly is treated as a cylinder of `length` along X with radius
 * `diameter / 2`. Its axis is projected onto the camera's own right and up
 * vectors, so both how far it spreads sideways and how far the tilt pushes it
 * into the shorter vertical dimension are accounted for; the binding one wins.
 * Without this the machine fits broadside and overflows once the path swings
 * round and lifts.
 */
export interface Axis {
  x: number;
  y: number;
  z: number;
}

export function framingDistance(
  pose: CameraPose,
  /** Unit direction the machine's axis points in world space. */
  axis: Axis,
  length: number,
  diameter: number,
  fovDegrees: number,
  aspect: number,
  margin = 1.12,
  /** Radius of the fanned-out parts, which sit around the column's middle. */
  spread = 0,
): number {
  const radius = diameter / 2;

  // The camera's own basis, built the way three builds it from world up.
  const [fx, fy, fz] = posePosition(pose, 1);
  const horizontal = Math.hypot(fz, fx) || 1e-6;
  const rx = fz / horizontal;
  const rz = -fx / horizontal;
  // Screen up is forward crossed with right; right has no vertical component.
  const ux = fy * rz;
  const uy = fz * rx - fx * rz;
  const uz = -fy * rx;

  const half = length / 2;
  const onRight = Math.abs(axis.x * rx + axis.z * rz);
  const onUp = Math.abs(axis.x * ux + axis.y * uy + axis.z * uz);
  const towardCamera = Math.abs(axis.x * fx + axis.y * fy + axis.z * fz);

  // The machine's ends and its fan are not stacked: the fanned parts sit around
  // the middle, so whichever reaches further on screen governs, not their sum.
  const halfHeight = Math.max(half * onUp, spread) + radius;
  const halfWidth = Math.max(half * onRight, spread) + radius;

  const tanHalfV = Math.tan(rad(fovDegrees) / 2);
  const tanHalfH = tanHalfV * aspect;

  // The near end of a tilted machine is much closer than its centre and
  // magnifies accordingly. Fit against that, or it overflows the frame.
  const near = half * towardCamera + radius;

  return (Math.max(halfWidth / tanHalfH, halfHeight / tanHalfV) + near) * margin * pose.distance;
}

/** Converts a pose and a distance into a camera position. */
export function posePosition(pose: CameraPose, distance: number): [number, number, number] {
  const az = rad(pose.azimuth);
  const el = rad(pose.elevation);
  return [
    distance * Math.cos(el) * Math.sin(az),
    distance * Math.sin(el),
    distance * Math.cos(el) * Math.cos(az),
  ];
}

export interface FramingOptions {
  /** Axial extent closed up. */
  assembledLength: number;
  /** Axial extent pulled fully apart. */
  explodedLength: number;
  /** Widest extent across, closed up. */
  diameter: number;
  /**
   * Widest extent across once open. Defaults to `diameter`, which is right for
   * a subject that grows along its axis; a subject that grows radially — a dome
   * whose regions separate outward — has to declare the larger figure or the
   * camera frames the intact assembly and lets the open one overflow.
   */
  explodedDiameter?: number;
  /** Radius the labelled parts fan out to when fully scattered. */
  scatterDistance: number;
  /** Vertical field of view in degrees; must match the canvas camera. */
  fov: number;
  aspect: number;
  margin: number;
}

export interface CameraState {
  pose: CameraPose;
  distance: number;
}

/**
 * The camera for a given master scroll position: the whole per-frame
 * calculation, so it can be tested as the thing that actually runs.
 *
 * Note which progress feeds what. The shot list is keyed on the master
 * timeline, because its keys line up with the acts. The machine's axial spread
 * uses explodeAmount, which opens and then draws back in — feeding that to the
 * shot list instead would run the camera forwards and then backwards again.
 */
export function cameraStateFor(
  master: number,
  spreadProgress: number,
  axialProgress: number,
  options: FramingOptions,
): CameraState {
  const pose = cameraAt(CAMERA_PATH, master);
  const { assembledLength, explodedLength, diameter, scatterDistance, fov, aspect, margin } = options;

  const length = assembledLength + (explodedLength - assembledLength) * axialProgress;
  const grown = diameter + ((options.explodedDiameter ?? diameter) - diameter) * axialProgress;
  const spread = scatterDistance * spreadProgress + grown / 2;

  // Framed for whichever way round the subject needs more room, rather than for
  // the way it happens to be facing, so the turn never dollies the camera.
  const distance = Math.max(
    framingDistance(pose, FLAT_AXIS, length, grown, fov, aspect, margin, spread),
    framingDistance(pose, UPRIGHT_AXIS, length, grown, fov, aspect, margin, spread),
  );

  return { pose, distance };
}

/** The two orientations the machine passes between as it stands up. */
const FLAT_AXIS: Axis = { x: 1, y: 0, z: 0 };
const UPRIGHT_AXIS: Axis = { x: 0, y: 1, z: 0 };
