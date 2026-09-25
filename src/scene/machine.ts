import { projects } from '../lib/data';
import type { Project } from '../lib/types';
import { ASSEMBLY } from './assembly';
import type { PartMotion } from './motion';
import { axisLayout, type AxisItem, type GearPlacement } from './axisLayout';
import { buildPart, type PartPieces } from './parts';

/**
 * The assembly is composed by hand, so it carries no repo data of its own. Each
 * part borrows a project for its label and panel until the two are designed
 * together; parts beyond the repo count, and repos beyond the part count, are
 * simply not paired.
 */
const paired = ASSEMBLY.slice(0, projects.length);

/** Each part is built once here; Gear reads its pieces back rather than rebuilding. */
export const partById: Record<string, PartPieces> = {};

/**
 * Axial extent of a part including its movers at full travel, so the layout
 * leaves room for pistons at the top of their stroke.
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

const items: AxisItem[] = paired.map((part, i) => {
  const project = projects[i];
  const pieces = buildPart(part.name, part.radius, `${part.name}-${i}-${project.id}`);
  partById[project.id] = pieces;
  return {
    id: project.id,
    language: project.language,
    radius: part.radius,
    depth: axialDepth(pieces),
  };
});

const layout = axisLayout(items);

export const placements: GearPlacement[] = layout.placements;
export const placementById: Record<string, GearPlacement> = Object.fromEntries(
  placements.map((p) => [p.id, p]),
);

/** Repos currently shown in the machine, in assembly order. */
export const machineProjects: Project[] = paired.map((_, i) => projects[i]);

/** Axial extent closed up and pulled apart; the camera frames the larger one. */
export const assembledLength = layout.assembledLength;
export const machineLength = layout.explodedLength;

/** Widest part across the axis, used to frame the camera when near end-on. */
export const machineDiameter = 2 * Math.max(...placements.map((p) => p.radius));

/** How each part moves, taken from the assembly it was composed in. */
export const motionById: Record<string, PartMotion> = Object.fromEntries(
  placements.map((p, i) => [p.id, paired[i].motion] as const),
);
