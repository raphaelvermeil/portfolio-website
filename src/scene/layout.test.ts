import { describe, expect, it } from 'vitest';
import { GAP, SHELL_MAX, SHELL_MIN, assignSectors, layoutGears, mulberry32, type LayoutItem } from './layout';

const items: LayoutItem[] = [
  ...['j1', 'j2', 'j3', 'j4', 'j5', 'j6', 'j7'].map((id) => ({ id, language: 'Java', radius: 1.0 })),
  ...['t1', 't2', 't3', 't4', 't5'].map((id) => ({ id, language: 'TypeScript', radius: 1.3 })),
  ...['p1', 'p2', 'p3', 'p4'].map((id) => ({ id, language: 'Python', radius: 0.8 })),
  { id: 'js1', language: 'JavaScript', radius: 1.6 },
  { id: 'js2', language: 'JavaScript', radius: 0.6 },
  { id: 'h1', language: 'HTML', radius: 0.9 },
  { id: 'r1', language: 'Ruby', radius: 0.6 },
  { id: 'n1', language: null, radius: 0.7 },
];

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('mulberry32', () => {
  it('is deterministic and in [0,1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('assignSectors', () => {
  it('orders languages by count desc then name, and sums to 2π', () => {
    const sectors = assignSectors(items);
    expect(sectors.map((s) => s.language)).toEqual(['Java', 'TypeScript', 'Python', 'JavaScript', 'HTML', 'Other', 'Ruby']);
    const total = sectors.reduce((s, x) => s + x.width, 0);
    expect(total).toBeCloseTo(Math.PI * 2, 6);
    for (let i = 1; i < sectors.length; i++) expect(sectors[i].start).toBeCloseTo(sectors[i - 1].start + sectors[i - 1].width, 6);
  });

  it('gives single-repo languages a minimum width', () => {
    const sectors = assignSectors(items);
    const ruby = sectors.find((s) => s.language === 'Ruby')!;
    expect(ruby.width).toBeGreaterThan(0.35);
  });
});

describe('layoutGears', () => {
  const out = layoutGears(items);

  it('places every item once, keeping radius and computing teeth', () => {
    expect(out.map((p) => p.id).sort()).toEqual(items.map((i) => i.id).sort());
    const js1 = out.find((p) => p.id === 'js1')!;
    expect(js1.radius).toBe(1.6);
    expect(js1.teeth).toBe(22);
    expect(out.find((p) => p.id === 'n1')!.language).toBe('Other');
  });

  it('is deterministic', () => {
    expect(layoutGears(items)).toEqual(out);
    expect(layoutGears([...items].reverse())).toEqual(out);
  });

  it('keeps gears roughly on the shell', () => {
    for (const p of out) {
      const r = Math.hypot(...p.position);
      expect(r).toBeGreaterThan(SHELL_MIN - 1.5);
      expect(r).toBeLessThan(SHELL_MAX + 1.5);
    }
  });

  it('leaves at least rA + rB + GAP between every pair', () => {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const need = out[i].radius + out[j].radius + GAP;
        expect(dist(out[i].position, out[j].position)).toBeGreaterThanOrEqual(need - 1e-6);
      }
    }
  });

  it('emits unit quaternions', () => {
    for (const p of out) expect(Math.hypot(...p.quaternion)).toBeCloseTo(1, 6);
  });
});
