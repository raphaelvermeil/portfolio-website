import { describe, expect, it } from 'vitest';
import { buildLinks } from './links';
import type { GearPlacement } from './layout';

const P = (id: string, language: string, x: number, y: number, z: number): GearPlacement => ({
  id,
  language,
  position: [x, y, z],
  quaternion: [0, 0, 0, 1],
  radius: 1,
  teeth: 14,
});

const placements = [
  P('a1', 'Java', 0, 0, 7),
  P('a2', 'Java', 3, 0, 7),
  P('a3', 'Java', 6, 0, 7),
  P('a4', 'Java', 3, 3, 7),
  P('b1', 'Python', 0, 0, -7),
  P('b2', 'Python', 3, 0, -7),
  P('c1', 'Ruby', 7, 0, 0),
];

function connected(ids: string[], edges: { a: string; b: string }[]): boolean {
  const parent = new Map(ids.map((i) => [i, i]));
  const find = (x: string): string => (parent.get(x) === x ? x : find(parent.get(x)!));
  for (const e of edges) parent.set(find(e.a), find(e.b));
  return new Set(ids.map(find)).size === 1;
}

describe('buildLinks', () => {
  const g = buildLinks(placements);

  it('connects every language cluster with shafts (a spanning tree)', () => {
    const java = g.shafts.filter((s) => s.language === 'Java');
    expect(java).toHaveLength(3);
    expect(connected(['a1', 'a2', 'a3', 'a4'], java)).toBe(true);
    expect(g.shafts.filter((s) => s.language === 'Python')).toHaveLength(1);
    expect(g.shafts.filter((s) => s.language === 'Ruby')).toHaveLength(0);
  });

  it('never links across languages with a shaft', () => {
    const lang = Object.fromEntries(placements.map((p) => [p.id, p.language]));
    for (const s of g.shafts) expect(lang[s.a]).toBe(lang[s.b]);
  });

  it('adds one belt between each consecutive cluster, through the closest pair', () => {
    expect(g.belts).toHaveLength(2);
    expect(g.belts[0]).toMatchObject({ a: 'a1', b: 'b1' });
    expect(g.belts[1]).toMatchObject({ a: 'b2', b: 'c1' });
  });

  it('pushes belt midpoints outward from the origin', () => {
    const [ax, ay, az] = placements[0].position;
    const [bx, by, bz] = placements[4].position;
    const mid = g.belts[0].mid;
    const plain = Math.hypot((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    expect(Math.hypot(...mid)).toBeGreaterThanOrEqual(plain);
  });

  it('alternates spin direction across every shaft', () => {
    for (const s of g.shafts) expect(g.spinDir[s.a]).toBe(-g.spinDir[s.b] as 1 | -1);
    for (const p of placements) expect([1, -1]).toContain(g.spinDir[p.id]);
  });

  it('handles an empty input', () => {
    expect(buildLinks([])).toEqual({ shafts: [], belts: [], spinDir: {} });
  });
});
