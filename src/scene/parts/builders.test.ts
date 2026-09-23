import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../lib/random';
import { BUILDERS, PART_NAMES } from './builders';

const RADIUS = 1.2;

function build(name: keyof typeof BUILDERS, seed = 7) {
  return BUILDERS[name](RADIUS, mulberry32(seed));
}

describe('part builders', () => {
  it('covers the eight archetypes', () => {
    expect(PART_NAMES).toHaveLength(8);
  });

  it.each(PART_NAMES)('%s produces non-empty geometry', (name) => {
    expect(build(name).getAttribute('position').count).toBeGreaterThan(0);
  });

  it.each(PART_NAMES)('%s stays within its radius', (name) => {
    const g = build(name);
    g.computeBoundingSphere();
    // Parts fill their footprint without overflowing the radius the layout reserved.
    expect(g.boundingSphere!.radius).toBeLessThanOrEqual(RADIUS * 1.35);
    expect(g.boundingSphere!.radius).toBeGreaterThan(RADIUS * 0.45);
  });

  it.each(PART_NAMES)('%s is centred on the origin', (name) => {
    const g = build(name);
    g.computeBoundingBox();
    const { min, max } = g.boundingBox!;
    expect(Math.abs(min.x + max.x)).toBeLessThan(RADIUS * 0.1);
    expect(Math.abs(min.y + max.y)).toBeLessThan(RADIUS * 0.1);
    expect(Math.abs(min.z + max.z)).toBeLessThan(RADIUS * 0.1);
  });

  it.each(PART_NAMES)('%s is flatter along the spin axis than it is wide', (name) => {
    const g = build(name);
    g.computeBoundingBox();
    const { min, max } = g.boundingBox!;
    expect(max.z - min.z).toBeLessThan(max.x - min.x);
  });

  it.each(PART_NAMES)('%s is deterministic for a given seed', (name) => {
    expect(Array.from(build(name).getAttribute('position').array)).toEqual(
      Array.from(build(name).getAttribute('position').array),
    );
  });

  it('varies with the seed where the archetype has free dimensions', () => {
    const a = build('knurledCollar', 1).getAttribute('position').count;
    const b = build('knurledCollar', 99).getAttribute('position').count;
    expect(a).not.toBe(b);
  });

  it('scales with radius', () => {
    const small = BUILDERS.bearing(0.6, mulberry32(3));
    const large = BUILDERS.bearing(1.6, mulberry32(3));
    small.computeBoundingSphere();
    large.computeBoundingSphere();
    expect(large.boundingSphere!.radius).toBeGreaterThan(small.boundingSphere!.radius * 2);
  });
});
