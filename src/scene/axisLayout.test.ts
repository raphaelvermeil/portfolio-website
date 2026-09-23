import { describe, expect, it } from 'vitest';
import { axisLayout, orderItems, partX, type AxisItem } from './axisLayout';

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
  const { placements, assembledLength, explodedLength } = axisLayout(orderItems(items));

  it('places every part and centres both states on the origin', () => {
    expect(placements).toHaveLength(items.length);
    for (const key of ['assembled', 'exploded'] as const) {
      const xs = placements.map((p) => p[key]);
      expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(0, 6);
    }
  });

  it('orders both states monotonically along the axis', () => {
    for (const key of ['assembled', 'exploded'] as const) {
      const xs = placements.map((p) => p[key]);
      expect(xs).toEqual([...xs].sort((a, b) => a - b));
    }
  });

  it('seats parts face to face when assembled, without overlapping', () => {
    const ordered = orderItems(items);
    for (let i = 1; i < placements.length; i++) {
      const step = placements[i].assembled - placements[i - 1].assembled;
      expect(step).toBeGreaterThanOrEqual((ordered[i].depth + ordered[i - 1].depth) / 2);
    }
  });

  it('pulls further apart when exploded than when assembled', () => {
    expect(explodedLength).toBeGreaterThan(assembledLength);
    for (let i = 1; i < placements.length; i++) {
      const apart = placements[i].exploded - placements[i - 1].exploded;
      const closed = placements[i].assembled - placements[i - 1].assembled;
      expect(apart).toBeGreaterThanOrEqual(closed);
    }
  });

  it('spaces deeper parts further apart', () => {
    const shallow = axisLayout([item('a', 'Java', 1, 0.2), item('b', 'Java', 1, 0.2)]);
    const deep = axisLayout([item('a', 'Java', 1, 1.5), item('b', 'Java', 1, 1.5)]);
    expect(deep.explodedLength).toBeGreaterThan(shallow.explodedLength);
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
    expect(axisLayout([])).toEqual({ placements: [], assembledLength: 0, explodedLength: 0 });
  });
});

describe('partX', () => {
  const [a] = axisLayout([item('a', 'Java', 1, 0.4), item('b', 'Java', 1, 0.4)]).placements;

  it('returns the assembled position at 0 and the exploded one at 1', () => {
    expect(partX(a, 0)).toBeCloseTo(a.assembled, 6);
    expect(partX(a, 1)).toBeCloseTo(a.exploded, 6);
  });

  it('interpolates in between', () => {
    expect(partX(a, 0.5)).toBeCloseTo((a.assembled + a.exploded) / 2, 6);
  });
});
