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

  it('fans the directions evenly around the axis', () => {
    const TAU = Math.PI * 2;
    const angles = plan.map((p) => Math.atan2(p.direction[1], p.direction[0]));
    // atan2 wraps at ±π, so bring each step back into one turn before comparing.
    const gaps = angles.slice(1).map((a, i) => ((a - angles[i]) % TAU + TAU) % TAU);
    for (const gap of gaps) expect(gap).toBeCloseTo(TAU / plan.length, 6);
  });

  it('separates every part from every other', () => {
    for (let i = 0; i < plan.length; i++) {
      for (let j = i + 1; j < plan.length; j++) {
        const [ay, az] = plan[i].direction;
        const [by, bz] = plan[j].direction;
        expect(Math.hypot(ay - by, az - bz)).toBeGreaterThan(0.2);
      }
    }
  });

  it('sends nothing straight up, where its own label sits', () => {
    for (const p of plan) expect(Math.abs(p.direction[1] - 1)).toBeGreaterThan(0.01);
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
