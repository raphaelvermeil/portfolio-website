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
 * It opens broadside and low, holds that while the machine comes apart along
 * its axis, then climbs in one move to look down on it — arriving overhead just
 * as the labelled parts step off the axis, and staying there while they fan out.
 * The elevation never falls: going back down would read as undoing the climb.
 */
export const CAMERA_PATH: CameraKey[] = [
  { at: 0, azimuth: -28, elevation: 6, distance: 1 },
  { at: 0.2, azimuth: -12, elevation: 9, distance: 1.03 },
  { at: 0.44, azimuth: 8, elevation: 17, distance: 1.05 },
  { at: 0.62, azimuth: 46, elevation: 62, distance: 1.02 },
  { at: 0.8, azimuth: 58, elevation: 70, distance: 1 },
  { at: 1, azimuth: 64, elevation: 72, distance: 1 },
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
