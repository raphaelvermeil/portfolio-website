import type { BufferGeometry } from 'three';
import { projects } from '../lib/data';
import type { Project } from '../lib/types';
import { ASSEMBLY } from './assembly';
import { axisLayout, type AxisItem, type GearPlacement } from './axisLayout';
import { buildPart } from './parts';

/**
 * The assembly is composed by hand, so it carries no repo data of its own. Each
 * part borrows a project for its label and panel until the two are designed
 * together; parts beyond the repo count, and repos beyond the part count, are
 * simply not paired.
 */
const paired = ASSEMBLY.slice(0, projects.length);

/** Each part is built once here; Gear reads its geometry back rather than rebuilding. */
export const partById: Record<string, BufferGeometry> = {};

const items: AxisItem[] = paired.map((part, i) => {
  const project = projects[i];
  const geometry = buildPart(part.name, part.radius, `${part.name}-${i}-${project.id}`);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  partById[project.id] = geometry;
  return {
    id: project.id,
    language: project.language,
    radius: part.radius,
    depth: box.max.z - box.min.z,
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

/** Neighbouring parts counter-rotate, the way a gear train does. */
export const spinDirById: Record<string, 1 | -1> = Object.fromEntries(
  placements.map((p, i) => [p.id, i % 2 === 0 ? 1 : -1] as const),
);
