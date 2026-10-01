import { describe, expect, it } from 'vitest';
import type { AssemblyLayer } from './assembly';
import { planSkillParts } from './skillParts';

const layers: AssemblyLayer[] = [
  { id: 'delivery', name: 'deliveryCrates', label: 'Delivery', tech: ['Docker'], color: '#3fbfb0', radius: 1.1, motion: { kind: 'still' } },
  { id: 'data', name: 'dataDiscs', label: 'Data', tech: ['MongoDB'], color: '#c58cff', radius: 1.2, motion: { kind: 'still' } },
  { id: 'models', name: 'modelLattice', label: 'Models', tech: ['Python'], color: '#ffa64d', radius: 1.3, motion: { kind: 'still' } },
  { id: 'services', name: 'serviceBoard', label: 'Services', tech: ['Go'], color: '#5fd67a', radius: 1.4, motion: { kind: 'still' } },
  { id: 'interface', name: 'interfacePlate', label: 'Interface', tech: ['TypeScript'], color: '#4fa3ff', radius: 1.5, motion: { kind: 'still' } },
];

describe('planSkillParts', () => {
  const plan = planSkillParts(layers);

  it('labels every layer, so nothing on screen is decorative', () => {
    expect(plan).toHaveLength(layers.length);
    expect(plan.map((p) => p.id)).toEqual(layers.map((l) => l.id));
    expect(plan.map((p) => p.label)).toEqual(layers.map((l) => l.label));
  });

  it('carries each layer\u2019s technologies and colour through to its label', () => {
    expect(plan.map((p) => p.tech)).toEqual(layers.map((l) => l.tech));
    expect(plan.map((p) => p.color)).toEqual(layers.map((l) => l.color));
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

  it('separates every layer from every other', () => {
    for (let i = 0; i < plan.length; i++) {
      for (let j = i + 1; j < plan.length; j++) {
        const [ax, az] = plan[i].direction;
        const [bx, bz] = plan[j].direction;
        expect(Math.hypot(ax - bx, az - bz)).toBeGreaterThan(0.2);
      }
    }
  });

  it('sends nothing straight up, where its own label sits', () => {
    for (const p of plan) expect(Math.abs(p.direction[1] - 1)).toBeGreaterThan(0.01);
  });

  it('handles an empty stack', () => {
    expect(planSkillParts([])).toEqual([]);
  });
});
