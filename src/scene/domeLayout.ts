import { Quaternion, Vector3 } from 'three';

/**
 * Seats parts on the cranial dome.
 *
 * This replaces the axial layout the earlier designs used. There the whole
 * placement was a scalar — how far along one axis a part sat — because the
 * subject was a column. A dome is volumetric, so a placement is a point, and
 * the explode runs outward along each part's own seat normal rather than along
 * a shared axis.
 *
 * Deliberately knows nothing about `brain.ts`: it takes plain data and types
 * `region` as a string, so the pure maths does not depend on the design.
 */

const PART_AXIS = new Vector3(0, 0, 1);
const UP = new Vector3(0, 1, 0);
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Radius of the cranial frame. Parts are seated inside it. */
export const DOME_RADIUS = 2.6;

/**
 * Semi-axis multipliers on DOME_RADIUS, as fractions.
 *
 * A cranium is an ovoid, not a hemisphere: flatter over the top and longer
 * front-to-back than side-to-side. A true hemisphere reads as a circus tent.
 *
 * This is shared deliberately. The frame is scaled by it and the seats are
 * placed on it, so the two cannot drift apart — scaling the whole scene instead
 * would stretch the gears into ellipses.
 */
export const CRANIUM = { x: 1, y: 0.86, z: 1.14 } as const;

/**
 * The cranium's radius in the horizontal plane at a given azimuth.
 *
 * Each meridian rib spans a different width, because the ellipse it lies in is
 * only circular when the two horizontal semi-axes agree.
 *
 * Azimuth is measured the same way everywhere in this module: from +Z, turning
 * toward +X, so `seatOf` and this agree on what an angle means. A caller
 * working in a frame rotated about +Y — a rib, whose local x starts along world
 * +X — has to add the quarter turn itself.
 */
export function craniumRadiusAt(azimuth: number): number {
  const a = rad(azimuth);
  const alongX = Math.sin(a) / CRANIUM.x;
  const alongZ = Math.cos(a) / CRANIUM.z;
  return 1 / Math.sqrt(alongX * alongX + alongZ * alongZ);
}

/** How far a part travels outward when the assembly opens. */
export const EXPLODE_GAP = 2.3;
/**
 * Seats sit at this fraction of the dome radius.
 *
 * Pulled well out toward the shell: seated nearer the centre the clusters bunch
 * into the middle and leave the dome visibly empty around them. The ceiling is
 * that a whole cluster — its ring plus the widest part on it — must still clear
 * the ribs, so INNER·DOME_RADIUS·CRANIUM.z + CLUSTER + maxRadius has to stay
 * under DOME_RADIUS·CRANIUM.z.
 */
const INNER = 0.66;
/**
 * Radius of the ring a region's parts are arranged in, around its seat.
 *
 * With n parts the adjacent centres are 2·CLUSTER·sin(π/n) apart, so at four
 * parts no part may exceed a radius of about 0.35 without its neighbours
 * interpenetrating.
 *
 * It also sets how low a region may sit. A cluster reaches CLUSTER·cos(e)
 * below its seat, and the seat is only sin(e)·CRANIUM.y·INNER·DOME_RADIUS
 * high, so a low region hangs out through the base ring.
 */
const CLUSTER = 0.5;

/** Exposed so the fit can be asserted rather than eyeballed. */
export const CLUSTER_REACH = CLUSTER;
/**
 * Each part in a cluster sits slightly deeper than the last, so they read as a
 * mechanism rather than a flat rosette.
 *
 * Kept small on purpose. It runs along the seat normal, so on a low region most
 * of it is downward — at 0.16 the fourth part of a cluster dropped far enough
 * to hang through the base ring, and the depth cue is cosmetic where the fit is
 * not.
 */
const STAGGER = 0.09;

export interface LayoutPart {
  id: string;
  radius: number;
}

export interface LayoutInput {
  region: string;
  /** Degrees about +Y. */
  azimuth: number;
  /** Degrees up from the XZ plane. */
  elevation: number;
  parts: LayoutPart[];
}

export interface SeatPlacement {
  id: string;
  region: string;
  assembled: [number, number, number];
  exploded: [number, number, number];
  quaternion: [number, number, number, number];
  radius: number;
}

export interface DomeLayout {
  placements: SeatPlacement[];
  regionCentroids: Record<string, [number, number, number]>;
  /** Furthest any part reaches from the centre, closed up and opened out. */
  assembledReach: number;
  explodedReach: number;
}

/** Where a part sits for a given explode factor, 0 (seated) to 1 (clear). */
export function seatPosition(
  placement: SeatPlacement,
  explode: number,
  target = new Vector3(),
): Vector3 {
  const t = Math.min(1, Math.max(0, explode));
  const [ax, ay, az] = placement.assembled;
  const [ex, ey, ez] = placement.exploded;
  return target.set(ax + (ex - ax) * t, ay + (ey - ay) * t, az + (ez - az) * t);
}

/** The point on the inner dome at a given azimuth and elevation. */
function seatOf(azimuth: number, elevation: number): Vector3 {
  const a = rad(azimuth);
  const e = rad(elevation);
  // On the inner ovoid, not an inner sphere, so clusters sit under the ribs
  // wherever the frame happens to bulge.
  //
  // The plan radius comes from craniumRadiusAt rather than from scaling x and z
  // separately. Scaling componentwise would make the azimuth the ellipse's
  // parametric angle instead of its polar angle, and the two agree only on the
  // axes — the seats would then describe a slightly different surface from the
  // ribs above them, by about half a percent.
  const plan = craniumRadiusAt(azimuth);
  return new Vector3(
    Math.cos(e) * Math.sin(a) * plan,
    Math.sin(e) * CRANIUM.y,
    Math.cos(e) * Math.cos(a) * plan,
  ).multiplyScalar(DOME_RADIUS * INNER);
}

export function domeLayout(input: LayoutInput[]): DomeLayout {
  const placements: SeatPlacement[] = [];
  const regionCentroids: Record<string, [number, number, number]> = {};
  let assembledReach = 0;
  let explodedReach = 0;

  for (const region of input) {
    const seat = seatOf(region.azimuth, region.elevation);
    const normal = seat.clone().normalize();
    regionCentroids[region.region] = [seat.x, seat.y, seat.z];

    // A basis in the plane tangent to the dome at this seat, so a cluster lies
    // flat against the shell rather than cutting through it.
    const t1 = new Vector3().crossVectors(UP, normal);
    if (t1.lengthSq() < 1e-6) t1.set(1, 0, 0);
    t1.normalize();
    const t2 = new Vector3().crossVectors(normal, t1).normalize();

    const quaternion = new Quaternion().setFromUnitVectors(PART_AXIS, normal);
    const q: [number, number, number, number] = [
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w,
    ];

    region.parts.forEach((part, i) => {
      const spread = region.parts.length === 1 ? 0 : CLUSTER;
      const angle = (i / Math.max(1, region.parts.length)) * Math.PI * 2;
      const assembled = seat
        .clone()
        .addScaledVector(t1, Math.cos(angle) * spread)
        .addScaledVector(t2, Math.sin(angle) * spread)
        .addScaledVector(normal, -i * STAGGER);
      const exploded = assembled.clone().addScaledVector(normal, EXPLODE_GAP);

      placements.push({
        id: part.id,
        region: region.region,
        assembled: [assembled.x, assembled.y, assembled.z],
        exploded: [exploded.x, exploded.y, exploded.z],
        quaternion: q,
        radius: part.radius,
      });
      assembledReach = Math.max(assembledReach, assembled.length() + part.radius);
      explodedReach = Math.max(explodedReach, exploded.length() + part.radius);
    });
  }

  return { placements, regionCentroids, assembledReach, explodedReach };
}
