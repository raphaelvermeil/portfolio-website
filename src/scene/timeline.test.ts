import { describe, expect, it } from 'vitest';
import { ACTS, actProgress, explodeAmount, scrollStage, type ActName } from './timeline';

const NAMES = Object.keys(ACTS) as ActName[];

describe('ACTS', () => {
  it('gives every act a forward span inside the timeline', () => {
    for (const name of NAMES) {
      const [from, to] = ACTS[name];
      expect(to).toBeGreaterThan(from);
      expect(from).toBeGreaterThanOrEqual(0);
      expect(to).toBeLessThanOrEqual(1);
    }
  });

  it('runs the acts in order', () => {
    const starts = NAMES.map((n) => ACTS[n][0]);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it('overlaps the handover so the type is still clearing as the machine arrives', () => {
    expect(ACTS.machineIn[0]).toBeLessThan(ACTS.typeOut[1]);
  });

  it('leaves no dead gap between the machine arriving and coming apart', () => {
    expect(ACTS.explode[0]).toBeLessThanOrEqual(ACTS.machineIn[1]);
  });

  it('finishes exactly at the end of the scroll', () => {
    expect(ACTS.machineOut[1]).toBe(1);
  });
});

describe('actProgress', () => {
  it('is 0 before an act and 1 after it', () => {
    expect(actProgress(0, 'explode')).toBe(0);
    expect(actProgress(ACTS.explode[0], 'explode')).toBe(0);
    expect(actProgress(1, 'explode')).toBe(1);
    expect(actProgress(ACTS.explode[1], 'explode')).toBe(1);
  });

  it('runs linearly across its own span', () => {
    const [from, to] = ACTS.explode;
    expect(actProgress(from + (to - from) / 2, 'explode')).toBeCloseTo(0.5, 6);
    expect(actProgress(from + (to - from) / 4, 'explode')).toBeCloseTo(0.25, 6);
  });

  it('reaches 1 for every act by the end of the timeline', () => {
    for (const name of NAMES) expect(actProgress(1, name)).toBe(1);
  });

  it('never leaves 0..1', () => {
    for (const name of NAMES) {
      for (let p = -0.5; p <= 1.5; p += 0.05) {
        const v = actProgress(p, name);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('scrollStage', () => {
  const HERO = 4000;
  const VIEWPORT = 1000;
  const RUNWAY = HERO - VIEWPORT;

  it('is 0 at the top and 1 once the runway is used up', () => {
    expect(scrollStage(0, HERO, VIEWPORT)).toBe(0);
    expect(scrollStage(RUNWAY, HERO, VIEWPORT)).toBe(1);
  });

  it('runs linearly in between', () => {
    expect(scrollStage(RUNWAY / 2, HERO, VIEWPORT)).toBeCloseTo(0.5, 6);
  });

  it('clamps past either end', () => {
    expect(scrollStage(-400, HERO, VIEWPORT)).toBe(0);
    expect(scrollStage(HERO * 3, HERO, VIEWPORT)).toBe(1);
  });

  it('stays at the start when the hero is not taller than the viewport', () => {
    expect(scrollStage(300, 900, 900)).toBe(0);
    expect(scrollStage(300, 0, 900)).toBe(0);
  });
});

describe('explodeAmount', () => {
  it('is closed at the start and fully open at the end of the explode', () => {
    expect(explodeAmount(0)).toBe(0);
    expect(explodeAmount(ACTS.explode[1])).toBeCloseTo(1, 6);
  });

  it('draws back in as the parts fan out, without closing up entirely', () => {
    const open = explodeAmount(ACTS.scatter[0]);
    const end = explodeAmount(1);
    expect(end).toBeLessThan(open);
    expect(end).toBeGreaterThan(0.3);
  });

  it('never leaves 0..1, and never runs backwards during the explode', () => {
    let previous = 0;
    for (let p = 0; p <= ACTS.explode[1]; p += 0.01) {
      const v = explodeAmount(p);
      expect(v).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = v;
    }
    for (let p = 0; p <= 1; p += 0.01) {
      expect(explodeAmount(p)).toBeGreaterThanOrEqual(0);
      expect(explodeAmount(p)).toBeLessThanOrEqual(1);
    }
  });
});
