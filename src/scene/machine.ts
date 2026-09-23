import type { BufferGeometry } from 'three';
import { radiusFor } from '../lib/activity';
import { projects } from '../lib/data';
import { axisLayout, type AxisItem, type GearPlacement } from './axisLayout';
import { createPart } from './parts';

/** Each part is built once here; Gear reads its geometry back rather than rebuilding. */
export const partById: Record<string, BufferGeometry> = {};

const items: AxisItem[] = projects.map((project) => {
  const radius = radiusFor(project.activity);
  const geometry = createPart({ id: project.id, language: project.language ?? 'Other', radius });
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  partById[project.id] = geometry;
  return { id: project.id, language: project.language, radius, depth: box.max.z - box.min.z };
});

const layout = axisLayout(items);

export const placements: GearPlacement[] = layout.placements;
export const placementById: Record<string, GearPlacement> = Object.fromEntries(
  placements.map((p) => [p.id, p]),
);

/** Length of the whole assembly along its axis, used to frame the camera. */
export const machineLength = layout.length;

/** Neighbouring parts counter-rotate, the way a gear train does. */
export const spinDirById: Record<string, 1 | -1> = Object.fromEntries(
  placements.map((p, i) => [p.id, i % 2 === 0 ? 1 : -1] as const),
);
