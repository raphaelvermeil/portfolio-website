import { radiusFor } from '../lib/activity';
import { projects } from '../lib/data';
import { buildLinks } from './links';
import { layoutGears, type GearPlacement } from './layout';

export const placements: GearPlacement[] = layoutGears(
  projects.map((p) => ({ id: p.id, language: p.language, radius: radiusFor(p.activity) })),
);

export const placementById: Record<string, GearPlacement> = Object.fromEntries(placements.map((p) => [p.id, p]));

export const links = buildLinks(placements);
