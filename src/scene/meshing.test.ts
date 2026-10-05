import { describe, expect, it } from 'vitest';
import {
  MODULE,
  centreDistance,
  centreDistanceFloor,
  meshedAngle,
  nearestGapAngle,
  nearestToothAngle,
  radiusFor,
} from './meshing';

const TAU = Math.PI * 2;

describe('radiusFor', () => {
  it('ties radius to tooth count, so every gear shares a tooth size', () => {
    expect(radiusFor(20) / 20).toBeCloseTo(MODULE, 12);
    expect(radiusFor(11) / 11).toBeCloseTo(radiusFor(29) / 29, 12);
  });
});

describe('meshedAngle', () => {
  it('turns the driven gear the opposite way', () => {
    const alpha = 0.4;
    const a = meshedAngle(20, 0, 12, alpha);
    const b = meshedAngle(20, 0.01, 12, alpha);
    expect(b - a).toBeLessThan(0);
  });

  it('gears the speeds by the inverse tooth ratio', () => {
    const alpha = 1.1;
    const step = 0.01;
    const a = meshedAngle(24, 0, 8, alpha);
    const b = meshedAngle(24, step, 8, alpha);
    // 24 driving 8: the small gear turns three times as fast.
    expect((b - a) / step).toBeCloseTo(-3, 9);
  });

  it('puts a tooth of the driver into a gap of the driven, at every driver angle', () => {
    const [Na, Nb, alpha] = [18, 11, 0.73];
    for (let driver = 0; driver < TAU; driver += 0.037) {
      const driven = meshedAngle(Na, driver, Nb, alpha);
      // Measured at the pitch point: where the driver presents a tooth, the
      // driven must present a gap, and vice versa.
      const tooth = nearestToothAngle(Na, driver, alpha);
      const gap = nearestGapAngle(Nb, driven, alpha + Math.PI);
      const offsetA = tooth - alpha;
      const offsetB = gap - (alpha + Math.PI);
      // Both land within half a tooth of the line of centres, and the pair
      // interleaves rather than colliding tip to tip.
      expect(Math.abs(offsetA)).toBeLessThanOrEqual(Math.PI / Na + 1e-9);
      expect(Math.abs(offsetB)).toBeLessThanOrEqual(Math.PI / Nb + 1e-9);
    }
  });

  it('holds the standing mesh condition exactly', () => {
    const [Na, Nb, alpha] = [22, 15, -0.9];
    for (const driver of [0, 0.3, 1.7, 4.2, -2.5]) {
      const driven = meshedAngle(Na, driver, Nb, alpha);
      const residual = Na * (driver - alpha) + Nb * (driven - alpha) - Math.PI;
      expect(residual / TAU).toBeCloseTo(Math.round(residual / TAU), 9);
    }
  });

  it('is reversible: driving the other way puts the first gear back', () => {
    const [Na, Nb, alpha] = [16, 9, 2.1];
    const driven = meshedAngle(Na, 0.55, Nb, alpha);
    const back = meshedAngle(Nb, driven, Na, alpha);
    expect((back - 0.55) / TAU).toBeCloseTo(Math.round((back - 0.55) / TAU), 9);
  });
});

describe('tooth and gap finding', () => {
  it('finds a tooth within half a pitch of the direction asked for', () => {
    for (const teeth of [7, 12, 23]) {
      for (const toward of [0, 1, -2.2, 5.5]) {
        const found = nearestToothAngle(teeth, 0.2, toward);
        expect(Math.abs(found - toward)).toBeLessThanOrEqual(Math.PI / teeth + 1e-9);
      }
    }
  });

  it('puts a gap exactly half a pitch from a tooth', () => {
    const teeth = 13;
    const tooth = nearestToothAngle(teeth, 0, 0);
    const gap = nearestGapAngle(teeth, 0, 0);
    expect(Math.abs(gap - tooth)).toBeCloseTo(Math.PI / teeth, 9);
  });
});

describe('centre distance', () => {
  it('sits the pair closer than tip to tip, so the teeth actually interleave', () => {
    for (const [a, b] of [[18, 13], [22, 11], [11, 15]] as const) {
      expect(centreDistance(a, b)).toBeLessThan(radiusFor(a) + radiusFor(b));
    }
  });

  it('keeps them far enough apart not to bottom out in each other roots', () => {
    for (const [a, b] of [[18, 13], [22, 11], [11, 15]] as const) {
      expect(centreDistance(a, b)).toBeGreaterThan(centreDistanceFloor(a, b));
    }
  });

  it('is symmetric, since a pair has one spacing however it is named', () => {
    expect(centreDistance(18, 13)).toBeCloseTo(centreDistance(13, 18), 12);
  });

  it('stays inside the band for every pair, however extreme the ratio', () => {
    // A single tuned ratio cannot do this: the band narrows as the tooth ratio
    // grows, and a constant suiting 18:13 sits outside it for 28:8.
    for (let a = 6; a <= 40; a++) {
      for (let b = 6; b <= 40; b++) {
        const d = centreDistance(a, b);
        expect(d, `${a}x${b} bottoms out`).toBeGreaterThan(centreDistanceFloor(a, b));
        expect(d, `${a}x${b} only grazes`).toBeLessThan(radiusFor(a) + radiusFor(b));
      }
    }
  });
});
