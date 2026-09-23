import { describe, expect, it } from 'vitest';
import { axisLayout, orderItems, type AxisItem } from './axisLayout';

const item = (id: string, language: string | null, radius = 1, depth = 0.4): AxisItem => ({
  id,
  language,
  radius,
  depth,
});

const items: AxisItem[] = [
  item('j1', 'Java', 1.4),
  item('j2', 'Java', 1.0),
  item('j3', 'Java', 0.8),
  item('t1', 'TypeScript', 1.6, 0.7),
  item('t2', 'TypeScript', 0.9),
  item('p1', 'Python', 1.1),
  item('r1', 'Ruby', 0.7),
  item('n1', null, 0.6),
];

describe('orderItems', () => {
  const ordered = orderItems(items);

  it('keeps every item exactly once', () => {
    expect(ordered.map((i) => i.id).sort()).toEqual(items.map((i) => i.id).sort());
  });

  it('keeps each language in one contiguous run', () => {
    const langs = ordered.map((i) => i.language ?? 'Other');
    const seen = new Set<string>();
    let previous = '';
    for (const lang of langs) {
      if (lang !== previous) {
        expect(seen.has(lang)).toBe(false);
        seen.add(lang);
        previous = lang;
      }
    }
  });

  it('puts the largest run in the middle', () => {
    const langs = ordered.map((i) => i.language ?? 'Other');
    const middle = langs[Math.floor(langs.length / 2)];
    expect(middle).toBe('Java');
  });

  it('descends by radius within a run', () => {
    const java = ordered.filter((i) => i.language === 'Java').map((i) => i.radius);
    expect(java).toEqual([...java].sort((a, b) => b - a));
  });

  it('is deterministic regardless of input order', () => {
    expect(orderItems([...items].reverse())).toEqual(ordered);
  });
});

describe('axisLayout', () => {
  const { placements, length } = axisLayout(items);

  it('places every part on the X axis, centred on the origin', () => {
    expect(placements).toHaveLength(items.length);
    for (const p of placements) {
      expect(p.position[1]).toBe(0);
      expect(p.position[2]).toBe(0);
    }
    const xs = placements.map((p) => p.position[0]);
    expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(0, 6);
  });

  it('orders positions monotonically along the axis', () => {
    const xs = placements.map((p) => p.position[0]);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it('leaves a gap between neighbours', () => {
    const xs = placements.map((p) => p.position[0]);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(0.32);
  });

  it('spaces deeper parts further apart', () => {
    const shallow = axisLayout([item('a', 'Java', 1, 0.2), item('b', 'Java', 1, 0.2)]);
    const deep = axisLayout([item('a', 'Java', 1, 1.5), item('b', 'Java', 1, 1.5)]);
    expect(deep.length).toBeGreaterThan(shallow.length);
  });

  it('reports the assembly length', () => {
    const xs = placements.map((p) => p.position[0]);
    expect(length).toBeCloseTo(Math.max(...xs) - Math.min(...xs), 6);
  });

  it('turns every part to face along the axis', () => {
    const [x, y, z, w] = placements[0].quaternion;
    expect(Math.hypot(x, y, z, w)).toBeCloseTo(1, 6);
    for (const p of placements) expect(p.quaternion).toEqual(placements[0].quaternion);
  });

  it('normalises a null language to Other', () => {
    expect(placements.find((p) => p.id === 'n1')!.language).toBe('Other');
  });

  it('handles an empty assembly', () => {
    expect(axisLayout([])).toEqual({ placements: [], length: 0 });
  });
});
