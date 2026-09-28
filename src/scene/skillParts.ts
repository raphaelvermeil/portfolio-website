import { skillShares, type SkillShare } from '../lib/skills';
import type { GearPlacement } from './axisLayout';
import { placements } from './machine';

export interface SkillPart {
  /** Placement this skill is pinned to. */
  id: string;
  language: string;
  color: string;
  share: number;
  /** Unit direction to pull away from the axis, in the plane across it (y, z). */
  direction: [number, number];
}

/**
 * How far a labelled part travels off the axis, in scene units. Kept tight: the
 * camera has to frame the whole fan, and a wide one is mostly empty air, which
 * pushes the machine small in frame.
 */
export const SCATTER_DISTANCE = 2.5;

/** How many skills get pulled out; more than this and the leaders start colliding. */
const MAX_PARTS = 5;

/**
 * Pins the top skills to parts along the assembly.
 *
 * The parts are spread down the machine so their leaders never bunch, and their
 * escape directions are fanned evenly around the axis. This is read from close
 * to end-on, where the plane across the axis faces the camera, so every
 * direction in that plane separates visibly.
 */
export function planSkillParts(
  items: GearPlacement[],
  shares: SkillShare[],
  max = MAX_PARTS,
): SkillPart[] {
  if (items.length === 0) return [];
  const chosen = shares.slice(0, Math.min(max, items.length));

  return chosen.map((share, i) => {
    const index = Math.round(((i + 0.5) / chosen.length) * (items.length - 1));
    // Half a step of offset so nothing escapes straight up into its own label.
    const angle = ((i + 0.5) / chosen.length) * Math.PI * 2;
    return {
      id: items[index].id,
      language: share.language,
      color: share.color,
      share: share.share,
      direction: [Math.cos(angle), Math.sin(angle)] as [number, number],
    };
  });
}

export const SKILL_PARTS: SkillPart[] = planSkillParts(placements, skillShares());

/** Lateral offset for a part at a given scatter progress; zero for parts that stay put. */
export const scatterById: Record<string, [number, number]> = Object.fromEntries(
  SKILL_PARTS.map((p) => [p.id, p.direction] as const),
);
