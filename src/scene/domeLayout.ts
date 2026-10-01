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

/** Radius of the cranial frame. Parts are seated inside it. */
export const DOME_RADIUS = 3.2;
/** How far a part travels outward when the assembly opens. */
export const EXPLODE_GAP = 2.3;
/** Seats sit at this fraction of the dome radius, so parts live under the ribs. */
const INNER = 0.62;
/** Radius of the ring a region's parts are arranged in, around its seat. */
const CLUSTER = 0.62;
/** Each part in a cluster sits slightly deeper than the last, so they read as a mechanism. */
const STAGGER = 0.16;

const PART_AXIS = new Vector3(0, 0, 1);
const UP = new Vector3(0, 1, 0);
const rad = (deg: number) => (deg * Math.PI) / 180;

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
  return new Vector3(
    Math.cos(e) * Math.sin(a),
    Math.sin(e),
    Math.cos(e) * Math.cos(a),
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
