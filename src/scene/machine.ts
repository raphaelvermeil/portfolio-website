import { ASSEMBLY } from './assembly';
import type { PartMotion } from './motion';
import { axisLayout, type AxisItem, type GearPlacement } from './axisLayout';
import { buildPart, type PartPieces } from './parts';

/** Each layer is built once here; Gear reads its pieces back rather than rebuilding. */
export const partById: Record<string, PartPieces> = {};

/**
 * Axial extent of a layer including its movers at full travel, so the layout
 * leaves room for a tile at the top of its lift.
 */
function axialDepth(pieces: PartPieces): number {
  pieces.body.computeBoundingBox();
  let min = pieces.body.boundingBox!.min.z;
  let max = pieces.body.boundingBox!.max.z;
  for (const mover of pieces.movers) {
    mover.geometry.computeBoundingBox();
    const travel = mover.motion.kind === 'reciprocate' ? mover.motion.travel : 0;
    min = Math.min(min, mover.geometry.boundingBox!.min.z + mover.offset[2] - travel);
    max = Math.max(max, mover.geometry.boundingBox!.max.z + mover.offset[2] + travel);
  }
  return max - min;
}

const items: AxisItem[] = ASSEMBLY.map((layer) => {
  const pieces = buildPart(layer.name, layer.radius, `${layer.name}-${layer.id}`);
  partById[layer.id] = pieces;
  return {
    id: layer.id,
    language: layer.label,
    radius: layer.radius,
    depth: axialDepth(pieces),
  };
});

const layout = axisLayout(items);

export const placements: GearPlacement[] = layout.placements;
export const placementById: Record<string, GearPlacement> = Object.fromEntries(
  placements.map((p) => [p.id, p]),
);

/** Axial extent closed up and pulled apart; the camera frames the larger one. */
export const assembledLength = layout.assembledLength;
export const machineLength = layout.explodedLength;

/** Widest layer across the axis, used to frame the camera when near end-on. */
export const machineDiameter = 2 * Math.max(...placements.map((p) => p.radius));

/** How each layer moves, taken from the assembly it was composed in. */
export const motionById: Record<string, PartMotion> = Object.fromEntries(
  ASSEMBLY.map((layer) => [layer.id, layer.motion] as const),
);
