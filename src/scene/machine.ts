import { Quaternion, Vector3 } from 'three';
import { FRAME_PARTS, REGIONS } from './brain';
import { DOME_RADIUS, domeLayout, type SeatPlacement } from './domeLayout';
import type { PartMotion } from './motion';
import { buildPart, type PartPieces } from './parts';

/** Each part is built once here; Gear reads its pieces back rather than rebuilding. */
export const partById: Record<string, PartPieces> = {};

const PART_AXIS = new Vector3(0, 0, 1);
const UP = new Vector3(0, 1, 0);

/** A frame part sits where it is put and never explodes. */
function fixed(
  id: string,
  at: [number, number, number],
  q: Quaternion,
  radius: number,
): SeatPlacement {
  return {
    id,
    region: 'frame',
    assembled: at,
    exploded: at,
    quaternion: [q.x, q.y, q.z, q.w],
    radius,
  };
}

/** Turns a part's local +Z to point along world +Y, so a disc lies flat. */
const LIE_FLAT = new Quaternion().setFromUnitVectors(PART_AXIS, UP);

/**
 * The frame is placed by hand rather than by domeLayout: ribs are meridians
 * standing in their own plane, not parts seated on the shell, and none of them
 * explode — the regions separate out of a frame that stays put.
 */
const framePlacements: SeatPlacement[] = FRAME_PARTS.map((part) => {
  const pieces = buildPart(part.name, part.radius, `${part.name}-${part.id}`);
  partById[part.id] = pieces;

  if (part.name === 'mountingRing') return fixed(part.id, [0, 0, 0], LIE_FLAT, part.radius);
  if (part.name === 'crownPlate') {
    return fixed(part.id, [0, DOME_RADIUS * 0.97, 0], LIE_FLAT, part.radius);
  }

  // A rib is built as an arc centred on its own origin, so its ends sit below
  // the origin. Lift it by that much and they land on the base ring.
  pieces.body.computeBoundingBox();
  const lift = -pieces.body.boundingBox!.min.y;
  const spin = new Quaternion().setFromAxisAngle(UP, (part.azimuth * Math.PI) / 180);
  return fixed(part.id, [0, lift, 0], spin, part.radius);
});

const layout = domeLayout(
  REGIONS.map((region) => ({
    region: region.id,
    azimuth: region.azimuth,
    elevation: region.elevation,
    parts: region.parts.map((part, i) => {
      const id = `${region.id}-${i}`;
      partById[id] = buildPart(part.name, part.radius, `${part.name}-${id}`);
      return { id, radius: part.radius };
    }),
  })),
);

export const placements: SeatPlacement[] = [...framePlacements, ...layout.placements];
export const placementById: Record<string, SeatPlacement> = Object.fromEntries(
  placements.map((p) => [p.id, p]),
);
export const regionCentroids = layout.regionCentroids;

/**
 * What the camera has to frame, closed up and opened out. The dome itself sets
 * the floor: the frame is always the widest thing until the regions clear it.
 */
export const brainDiameter = 2 * Math.max(DOME_RADIUS, layout.assembledReach);
export const explodedDiameter = 2 * Math.max(DOME_RADIUS, layout.explodedReach);

/** How each part moves. Frame parts are still. */
export const motionById: Record<string, PartMotion> = {
  ...Object.fromEntries(FRAME_PARTS.map((p) => [p.id, { kind: 'still' } as PartMotion])),
  ...Object.fromEntries(
    REGIONS.flatMap((region) =>
      region.parts.map((part, i) => [`${region.id}-${i}`, part.motion] as const),
    ),
  ),
};
