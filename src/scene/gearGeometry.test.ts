import { describe, expect, it } from 'vitest';
import { TEETH_MAX, TEETH_MIN, createGearGeometry, gearOutline, teethFor } from './gearGeometry';

describe('teethFor', () => {
  it('scales with radius at 14 teeth per unit', () => {
    expect(teethFor(1.0)).toBe(14);
    expect(teethFor(1.6)).toBe(22);
  });

  it('clamps to [8, 28]', () => {
    expect(teethFor(0.1)).toBe(TEETH_MIN);
    expect(teethFor(0.6)).toBe(8);
    expect(teethFor(5)).toBe(TEETH_MAX);
  });
});

describe('gearOutline', () => {
  it('emits four points per tooth', () => {
    expect(gearOutline(1, 12)).toHaveLength(48);
  });

  it('spans from the root radius to the outer radius', () => {
    const rs = gearOutline(1, 12).map((p) => p.length());
    expect(Math.max(...rs)).toBeCloseTo(1, 6);
    expect(Math.min(...rs)).toBeCloseTo(0.82, 6);
  });
});

describe('createGearGeometry', () => {
  it('has a bounding sphere about the size of the radius, centred on the origin', () => {
    const g = createGearGeometry(1.2, 16);
    g.computeBoundingSphere();
    expect(g.boundingSphere!.radius).toBeGreaterThan(1.15);
    expect(g.boundingSphere!.radius).toBeLessThan(1.3);
    expect(Math.abs(g.boundingSphere!.center.z)).toBeLessThan(0.01);
  });

  it('is symmetric in z (centred extrusion)', () => {
    const g = createGearGeometry(1, 10, 0.2);
    g.computeBoundingBox();
    expect(g.boundingBox!.min.z).toBeCloseTo(-0.1, 6);
    expect(g.boundingBox!.max.z).toBeCloseTo(0.1, 6);
  });

  it('has a bore hole (no vertex at the exact centre)', () => {
    const g = createGearGeometry(1, 10);
    const pos = g.getAttribute('position');
    let minR = Infinity;
    for (let i = 0; i < pos.count; i++) minR = Math.min(minR, Math.hypot(pos.getX(i), pos.getY(i)));
    expect(minR).toBeGreaterThan(0.15);
  });
});
