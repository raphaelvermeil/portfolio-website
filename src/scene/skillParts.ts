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

/** Widest tilt away from straight-sideways, in radians. */
const TILT = 0.5;

/**
 * Pins the top skills to parts along the assembly.
 *
 * The parts are spread down the machine so their leaders never bunch, and they
 * step out to alternating sides of the axis. The side matters: this is read
 * from overhead, and a part escaping towards the camera would foreshorten to
 * nothing, so the travel is mostly across the axis with only a little tilt.
 */
export function planSkillParts(
  items: GearPlacement[],
  shares: SkillShare[],
  max = MAX_PARTS,
): SkillPart[] {
  if (items.length === 0) return [];
  const chosen = shares.slice(0, Math.min(max, items.length));

  const last = Math.max(1, chosen.length - 1);

  return chosen.map((share, i) => {
    const index = Math.round(((i + 0.5) / chosen.length) * (items.length - 1));
    const side = i % 2 === 0 ? 1 : -1;
    const tilt = (i / last - 0.5) * 2 * TILT;
    return {
      id: items[index].id,
      language: share.language,
      color: share.color,
      share: share.share,
      direction: [Math.sin(tilt), side * Math.cos(tilt)] as [number, number],
    };
  });
}

export const SKILL_PARTS: SkillPart[] = planSkillParts(placements, skillShares());

/** Lateral offset for a part at a given scatter progress; zero for parts that stay put. */
export const scatterById: Record<string, [number, number]> = Object.fromEntries(
  SKILL_PARTS.map((p) => [p.id, p.direction] as const),
);
