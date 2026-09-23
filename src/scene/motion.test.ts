import { describe, expect, it } from 'vitest';
import { moverAngle, moverOffset, partAngle, type PartMotion } from './motion';

const TAU = Math.PI * 2;

describe('partAngle', () => {
  it('leaves a still part alone', () => {
    expect(partAngle({ kind: 'still' }, 3.2)).toBe(0);
  });

  it('turns once per second at one turn per second', () => {
    expect(partAngle({ kind: 'spin', turnsPerSecond: 1 }, 1)).toBeCloseTo(TAU, 6);
    expect(partAngle({ kind: 'spin', turnsPerSecond: 0.25 }, 2)).toBeCloseTo(TAU / 2, 6);
  });

  it('reverses with a negative rate', () => {
    expect(partAngle({ kind: 'spin', turnsPerSecond: -1 }, 1)).toBeCloseTo(-TAU, 6);
  });

  it('rocks within its amplitude and returns to centre', () => {
    const rock: PartMotion = { kind: 'rock', degrees: 12, hz: 1 };
    const limit = (12 * Math.PI) / 180;
    for (let t = 0; t < 2; t += 0.05) expect(Math.abs(partAngle(rock, t))).toBeLessThanOrEqual(limit + 1e-9);
    expect(partAngle(rock, 0)).toBeCloseTo(0, 6);
    expect(partAngle(rock, 0.25)).toBeCloseTo(limit, 6);
    expect(partAngle(rock, 1)).toBeCloseTo(0, 6);
  });
});

describe('partAngle tick', () => {
  const tick: PartMotion = { kind: 'tick', steps: 12, ticksPerSecond: 1 };
  const step = TAU / 12;

  it('lands exactly on a step and holds there', () => {
    expect(partAngle(tick, 0.5)).toBeCloseTo(step, 6);
    expect(partAngle(tick, 0.95)).toBeCloseTo(step, 6);
    expect(partAngle(tick, 1.5)).toBeCloseTo(step * 2, 6);
  });

  it('advances one step per beat', () => {
    for (let n = 0; n < 6; n++) expect(partAngle(tick, n + 0.5)).toBeCloseTo(step * (n + 1), 6);
  });

  it('snaps rather than drifting: most of a beat is dwell', () => {
    const moving = partAngle(tick, 0.1) - partAngle(tick, 0.05);
    const dwelling = partAngle(tick, 0.9) - partAngle(tick, 0.5);
    expect(moving).toBeGreaterThan(0);
    expect(dwelling).toBe(0);
  });

  it('never runs backwards', () => {
    let previous = -Infinity;
    for (let t = 0; t < 5; t += 0.017) {
      const a = partAngle(tick, t);
      expect(a).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = a;
    }
  });

  it('honours an anticlockwise direction', () => {
    expect(partAngle({ ...tick, direction: -1 }, 0.5)).toBeCloseTo(-step, 6);
  });
});

describe('mover motion', () => {
  it('spins a mover about its own centre', () => {
    expect(moverAngle({ kind: 'spin', turnsPerSecond: 2 }, 0.5)).toBeCloseTo(TAU, 6);
    expect(moverOffset({ kind: 'spin', turnsPerSecond: 2 }, 0.5)).toBe(0);
  });

  it('reciprocates within its travel', () => {
    const piston = { kind: 'reciprocate', travel: 0.3, hz: 1, phase: 0 } as const;
    expect(moverOffset(piston, 0)).toBeCloseTo(0, 6);
    expect(moverOffset(piston, 0.25)).toBeCloseTo(0.3, 6);
    expect(moverOffset(piston, 0.75)).toBeCloseTo(-0.3, 6);
    for (let t = 0; t < 2; t += 0.05) expect(Math.abs(moverOffset(piston, t))).toBeLessThanOrEqual(0.3 + 1e-9);
    expect(moverAngle(piston, 0.3)).toBe(0);
  });

  it('separates siblings by phase', () => {
    const a = { kind: 'reciprocate', travel: 0.3, hz: 1, phase: 0 } as const;
    const b = { kind: 'reciprocate', travel: 0.3, hz: 1, phase: 0.5 } as const;
    expect(moverOffset(a, 0.25)).toBeCloseTo(-moverOffset(b, 0.25), 6);
  });
});
