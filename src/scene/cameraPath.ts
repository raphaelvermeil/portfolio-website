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
 * The machine stands upright, so the column is vertical on screen throughout and
 * elevation alone decides how much we look down it.
 *
 * It opens low, almost level with the stack, and holds there while the machine
 * comes apart. Then the camera rises in one move to look down into it, arriving
 * just as the labelled parts step off the axis, and stays there while they fan
 * out around the column. Azimuth only drifts, to keep the parts from lining up
 * flat. Neither angle ever runs backwards.
 */
export const CAMERA_PATH: CameraKey[] = [
  { at: 0, azimuth: -22, elevation: 6, distance: 1 },
  { at: 0.2, azimuth: -10, elevation: 10, distance: 1.02 },
  { at: 0.44, azimuth: 6, elevation: 16, distance: 1.04 },
  { at: 0.62, azimuth: 26, elevation: 56, distance: 1 },
  { at: 0.8, azimuth: 36, elevation: 62, distance: 1 },
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
export function framingDistance(
  pose: CameraPose,
  length: number,
  diameter: number,
  fovDegrees: number,
  aspect: number,
  margin = 1.12,
  /** Radius of the fanned-out parts, which sit around the column's middle. */
  spread = 0,
): number {
  // The machine stands on the world's vertical, so its length lands entirely on
  // the screen's vertical, foreshortened by how far the camera has risen. Its
  // girth is all that governs the width, whatever the azimuth.
  const el = rad(pose.elevation);
  const radius = diameter / 2;
  const cos = Math.abs(Math.cos(el));
  const sin = Math.abs(Math.sin(el));

  // The column's ends and the fan are not stacked: the fanned parts sit around
  // the middle, so whichever reaches higher on screen governs, not their sum.
  const halfHeight = Math.max((length / 2) * cos, spread * sin) + radius;
  const halfWidth = Math.max(spread, radius);

  const tanHalfV = Math.tan(rad(fovDegrees) / 2);
  const tanHalfH = tanHalfV * aspect;

  // Once the camera rises, the near end of the column is much closer than the
  // centre and magnifies accordingly. Fit against that, or the top overflows.
  const near = (length / 2) * sin + radius;

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
