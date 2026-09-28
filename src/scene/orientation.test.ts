import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { machineAxis, machineQuaternion } from './orientation';

describe('machineAxis', () => {
  it('lies flat at the start', () => {
    const axis = machineAxis(0);
    expect(axis.y).toBeCloseTo(0, 6);
    expect(Math.hypot(axis.x, axis.z)).toBeCloseTo(1, 6);
  });

  it('stands upright at the end', () => {
    const axis = machineAxis(1);
    expect(axis.x).toBeCloseTo(0, 6);
    expect(axis.y).toBeCloseTo(1, 6);
    expect(axis.z).toBeCloseTo(0, 6);
  });

  it('rises steadily, never dipping back down', () => {
    let previous = -Infinity;
    for (let p = 0; p <= 1; p += 0.01) {
      const y = machineAxis(p).y;
      expect(y).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = y;
    }
  });

  it('stays a unit direction throughout', () => {
    for (let p = 0; p <= 1; p += 0.05) expect(machineAxis(p).length()).toBeCloseTo(1, 6);
  });

  it('stands up in the plane of the screen, never leaving it', () => {
    // A single turn about Z keeps the axis in the XY plane the whole way.
    for (let p = 0; p <= 1; p += 0.02) expect(machineAxis(p).z).toBeCloseTo(0, 9);
  });

  it('clamps outside the range', () => {
    expect(machineAxis(-2).y).toBeCloseTo(machineAxis(0).y, 9);
    expect(machineAxis(4).y).toBeCloseTo(1, 6);
  });

  it('writes into a caller-supplied target rather than allocating', () => {
    const target = new Vector3(9, 9, 9);
    expect(machineAxis(1, target)).toBe(target);
    expect(target.y).toBeCloseTo(1, 6);
  });
});

describe('machineQuaternion', () => {
  it('is a unit rotation at every step', () => {
    for (let p = 0; p <= 1; p += 0.05) expect(machineQuaternion(p).length()).toBeCloseTo(1, 6);
  });

  it('turns about Z alone', () => {
    for (let p = 0; p <= 1; p += 0.05) {
      const q = machineQuaternion(p);
      expect(q.x).toBeCloseTo(0, 9);
      expect(q.y).toBeCloseTo(0, 9);
    }
  });

  it('ends at no rotation at all, so the layout is used as built', () => {
    const q = machineQuaternion(1);
    expect(q.x).toBeCloseTo(0, 6);
    expect(q.y).toBeCloseTo(0, 6);
    expect(q.z).toBeCloseTo(0, 6);
    expect(Math.abs(q.w)).toBeCloseTo(1, 6);
  });

  it('turns continuously, with no jump between steps', () => {
    let previous = machineQuaternion(0).clone();
    for (let p = 0.02; p <= 1; p += 0.02) {
      const q = machineQuaternion(p).clone();
      expect(previous.angleTo(q)).toBeLessThan(0.2);
      previous = q;
    }
  });
});
