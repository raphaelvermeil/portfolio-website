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
 * The shot list. Scrolling walks the camera through these poses, so the machine
 * turns as it comes apart: it opens broadside and closed, swings up and round as
 * the parts separate, passes close to end-on where they read as nested rings,
 * then drops below the axis and settles back to three-quarter.
 */
export const CAMERA_PATH: CameraKey[] = [
  { at: 0, azimuth: -26, elevation: 9, distance: 1 },
  { at: 0.3, azimuth: -6, elevation: 17, distance: 1.04 },
  { at: 0.55, azimuth: 27, elevation: 23, distance: 1.1 },
  { at: 0.8, azimuth: 58, elevation: 11, distance: 1.16 },
  { at: 1, azimuth: 34, elevation: -9, distance: 1.06 },
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
export function framingDistance(
  pose: CameraPose,
  length: number,
  diameter: number,
  fovDegrees: number,
  aspect: number,
  margin = 1.12,
): number {
  const az = rad(pose.azimuth);
  const el = rad(pose.elevation);

  // Unit vector from the machine towards the camera.
  const dx = Math.cos(el) * Math.sin(az);
  const dy = Math.sin(el);
  const dz = Math.cos(el) * Math.cos(az);

  // Screen axes: right is perpendicular to the view and to world up.
  const horizontal = Math.hypot(dx, dz) || 1e-6;
  const axisOnRight = dz / horizontal;
  const axisOnUp = (-dy * dx) / horizontal;

  const half = length / 2;
  const radius = diameter / 2;
  const halfWidth = Math.abs(half * axisOnRight) + radius;
  const halfHeight = Math.abs(half * axisOnUp) + radius;

  const tanHalfV = Math.tan(rad(fovDegrees) / 2);
  const tanHalfH = tanHalfV * aspect;

  return Math.max(halfWidth / tanHalfH, halfHeight / tanHalfV) * margin * pose.distance;
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
