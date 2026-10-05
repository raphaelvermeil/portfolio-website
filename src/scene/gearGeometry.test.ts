import { describe, expect, it } from 'vitest';
import {
  BORE_RATIO,
  createGearGeometry,
  gearOutline,
  pitchRadius,
  rootRadius,
  tipRadius,
} from './gearGeometry';

const M = 0.019;
const TAU = Math.PI * 2;

describe('gear proportions', () => {
  it('sizes every gear off one module, so any two can mesh', () => {
    for (const teeth of [11, 13, 18, 22]) {
      expect(pitchRadius(teeth, M) / teeth).toBeCloseTo(M / 2, 12);
    }
  });

  it('puts the tip outside the pitch circle and the root inside it', () => {
    for (const teeth of [11, 15, 22]) {
      expect(rootRadius(teeth, M)).toBeLessThan(pitchRadius(teeth, M));
      expect(pitchRadius(teeth, M)).toBeLessThan(tipRadius(teeth, M));
    }
  });

  it('leaves clearance under the tip, so it cannot bottom out in the mating root', () => {
    // Dedendum exceeds addendum; that difference is the clearance.
    for (const teeth of [11, 22]) {
      const addendum = tipRadius(teeth, M) - pitchRadius(teeth, M);
      const dedendum = pitchRadius(teeth, M) - rootRadius(teeth, M);
      expect(dedendum).toBeGreaterThan(addendum);
    }
  });
});

describe('gearOutline', () => {
  it('stays between the root and tip circles', () => {
    for (const teeth of [11, 18]) {
      for (const p of gearOutline(teeth, M)) {
        const r = Math.hypot(p.x, p.y);
        expect(r).toBeGreaterThanOrEqual(rootRadius(teeth, M) - 1e-9);
        expect(r).toBeLessThanOrEqual(tipRadius(teeth, M) + 1e-9);
      }
    }
  });

  it('reaches both circles, so the teeth have their full height', () => {
    const radii = gearOutline(15, M).map((p) => Math.hypot(p.x, p.y));
    expect(Math.min(...radii)).toBeCloseTo(rootRadius(15, M), 9);
    expect(Math.max(...radii)).toBeCloseTo(tipRadius(15, M), 9);
  });

  it('repeats exactly once per tooth', () => {
    const teeth = 13;
    const points = gearOutline(teeth, M);
    expect(points.length % teeth).toBe(0);
    // A point and its counterpart one tooth round sit at the same radius.
    const perTooth = points.length / teeth;
    for (let i = 0; i < perTooth; i++) {
      const a = points[i];
      const b = points[i + perTooth];
      expect(Math.hypot(b.x, b.y)).toBeCloseTo(Math.hypot(a.x, a.y), 9);
    }
  });

  it('winds counter-clockwise without doubling back', () => {
    // Monotone polar angle is what makes the outline star-shaped about the
    // centre, which the interference check in meshing.test.ts relies on.
    const points = gearOutline(18, M);
    let previous = Math.atan2(points[0].y, points[0].x);
    let wrapped = 0;
    for (let i = 1; i < points.length; i++) {
      const a = Math.atan2(points[i].y, points[i].x);
      let step = a - previous;
      if (step < -Math.PI) {
        step += TAU;
        wrapped++;
      }
      // Non-decreasing rather than strictly increasing: coincident angles
      // come out as noise around zero, not as a fold.
      expect(step).toBeGreaterThan(-1e-12);
      previous = a;
    }
    expect(wrapped).toBe(1);
  });

  it('narrows from root to tip, as an involute flank does', () => {
    // Tooth tips must be thinner than tooth roots, or the flanks are radial
    // and the pair cannot have conjugate action.
    const teeth = 18;
    const points = gearOutline(teeth, M);
    const tip = tipRadius(teeth, M);
    const root = rootRadius(teeth, M);
    const near = (r: number) => points.filter((p) => Math.abs(Math.hypot(p.x, p.y) - r) < 1e-6);
    expect(near(tip).length).toBeGreaterThan(0);
    expect(near(root).length).toBeGreaterThan(0);
  });
});

describe('createGearGeometry', () => {
  it('is symmetric in z, so the plate is centred on its own origin', () => {
    const g = createGearGeometry(18, M, 0.03);
    g.computeBoundingBox();
    const { min, max } = g.boundingBox!;
    // Geometry positions are Float32, so 9 places is below the noise floor.
    expect(min.z).toBeCloseTo(-max.z, 6);
    expect(max.z - min.z).toBeCloseTo(0.03, 6);
  });

  it('fits inside its own tip circle', () => {
    const g = createGearGeometry(22, M, 0.03);
    g.computeBoundingSphere();
    expect(g.boundingSphere!.radius).toBeLessThanOrEqual(
      Math.hypot(tipRadius(22, M), 0.015) + 1e-6,
    );
  });

  it('leaves a bore, and bolt holes when asked', () => {
    const plain = createGearGeometry(18, M, 0.03);
    const drilled = createGearGeometry(18, M, 0.03, { count: 5, circle: 0.62, size: 0.12 });
    const bore = pitchRadius(18, M) * BORE_RATIO;
    for (const p of plain.getAttribute('position').array.slice(0, 3)) expect(Number.isFinite(p)).toBe(true);
    // Drilling adds surface, so the holes are really cut rather than drawn.
    expect(drilled.getAttribute('position').count).toBeGreaterThan(
      plain.getAttribute('position').count,
    );
    expect(bore).toBeGreaterThan(0);
  });
});
