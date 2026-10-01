import { ASSEMBLY, type AssemblyLayer } from './assembly';

export interface SkillPart {
  /** Placement this label is pinned to. */
  id: string;
  label: string;
  tech: string[];
  color: string;
  /** Unit direction to pull away from the upright axis, in the horizontal plane (x, z). */
  direction: [number, number];
}

/**
 * How far a labelled layer travels off the axis, in scene units.
 *
 * A trade-off in both directions: too tight and the plates overlap, because a
 * layer is a square roughly 2.1 across where a gear was a disc barely 1 wide;
 * too wide and the fan is mostly empty air, which pushes the stack small in
 * frame. 3.4 clears the corners at five layers.
 */
export const SCATTER_DISTANCE = 3.4;

/**
 * Fans every layer off the axis, each with its own label.
 *
 * Every layer carries a label, so nothing on screen is decorative — that is the
 * point of the stack over the old gear train, where only five of eighteen parts
 * meant anything. Escape directions are fanned evenly around the axis; the stack
 * is read from above by the time this happens, so that plane faces the camera
 * and every direction in it separates visibly.
 */
export function planSkillParts(layers: AssemblyLayer[]): SkillPart[] {
  return layers.map((layer, i) => {
    // Half a step of offset so nothing escapes straight up into its own label.
    const angle = ((i + 0.5) / layers.length) * Math.PI * 2;
    return {
      id: layer.id,
      label: layer.label,
      tech: layer.tech,
      color: layer.color,
      direction: [Math.cos(angle), Math.sin(angle)] as [number, number],
    };
  });
}

export const SKILL_PARTS: SkillPart[] = planSkillParts(ASSEMBLY);

/** Lateral offset for a layer at a given scatter progress. */
export const scatterById: Record<string, [number, number]> = Object.fromEntries(
  SKILL_PARTS.map((p) => [p.id, p.direction] as const),
);
