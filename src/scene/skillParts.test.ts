import { describe, expect, it } from 'vitest';
import type { SkillShare } from '../lib/skills';
import type { GearPlacement } from './axisLayout';
import { planSkillParts } from './skillParts';

const items: GearPlacement[] = Array.from({ length: 12 }, (_, i) => ({
  id: `part-${i}`,
  language: 'Java',
  assembled: i,
  exploded: i * 2,
  quaternion: [0, 0, 0, 1],
  radius: 1,
}));

const shares: SkillShare[] = [
  { language: 'TypeScript', color: '#4fa3ff', share: 0.4 },
  { language: 'Java', color: '#ff8a3d', share: 0.25 },
  { language: 'Python', color: '#5fd67a', share: 0.2 },
  { language: 'HTML', color: '#ff6b6b', share: 0.1 },
  { language: 'CSS', color: '#c58cff', share: 0.05 },
];

describe('planSkillParts', () => {
  const plan = planSkillParts(items, shares);

  it('pins one part per skill, in share order', () => {
    expect(plan).toHaveLength(shares.length);
    expect(plan.map((p) => p.language)).toEqual(shares.map((s) => s.language));
  });

  it('never pins two skills to the same part', () => {
    expect(new Set(plan.map((p) => p.id)).size).toBe(plan.length);
  });

  it('spreads the parts down the assembly in order', () => {
    const indices = plan.map((p) => items.findIndex((i) => i.id === p.id));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(Math.min(...indices)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...indices)).toBeLessThan(items.length);
  });

  it('escapes along unit directions', () => {
    for (const p of plan) expect(Math.hypot(...p.direction)).toBeCloseTo(1, 6);
  });

  it('alternates sides of the axis', () => {
    const sides = plan.map((p) => Math.sign(p.direction[1]));
    for (let i = 1; i < sides.length; i++) expect(sides[i]).toBe(-sides[i - 1]);
  });

  it('travels mostly across the axis, not towards the overhead camera', () => {
    // The z component is what an overhead camera sees; y points at it and would
    // foreshorten away, so it must stay the smaller of the two.
    for (const p of plan) expect(Math.abs(p.direction[1])).toBeGreaterThan(Math.abs(p.direction[0]));
  });

  it('tilts them apart rather than stacking them on two lines', () => {
    const tilts = plan.map((p) => p.direction[0]);
    expect(new Set(tilts.map((t) => t.toFixed(4))).size).toBe(plan.length);
    expect(Math.max(...tilts)).toBeGreaterThan(0);
    expect(Math.min(...tilts)).toBeLessThan(0);
  });

  it('caps how many parts are pulled out', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ ...shares[0], language: `L${i}` }));
    expect(planSkillParts(items, many)).toHaveLength(5);
    expect(planSkillParts(items, many, 3)).toHaveLength(3);
  });

  it('never asks for more parts than the assembly has', () => {
    expect(planSkillParts(items.slice(0, 2), shares)).toHaveLength(2);
    expect(planSkillParts([], shares)).toEqual([]);
  });
});
