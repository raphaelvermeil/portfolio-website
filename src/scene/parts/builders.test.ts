import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../lib/random';
import { BUILDERS, PART_NAMES, toPieces } from './builders';

const RADIUS = 1.2;

/** The body alone: movers are checked separately, since they sit off-centre by design. */
function build(name: keyof typeof BUILDERS, seed = 7) {
  return toPieces(BUILDERS[name](RADIUS, mulberry32(seed))).body;
}

function pieces(name: keyof typeof BUILDERS, seed = 7) {
  return toPieces(BUILDERS[name](RADIUS, mulberry32(seed)));
}

describe('part builders', () => {
  it('exposes the full archetype set', () => {
    expect(PART_NAMES.length).toBeGreaterThanOrEqual(16);
    expect(new Set(PART_NAMES).size).toBe(PART_NAMES.length);
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
    const small = toPieces(BUILDERS.bearing(0.6, mulberry32(3))).body;
    const large = toPieces(BUILDERS.bearing(1.6, mulberry32(3))).body;
    small.computeBoundingSphere();
    large.computeBoundingSphere();
    expect(large.boundingSphere!.radius).toBeGreaterThan(small.boundingSphere!.radius * 2);
  });

  it.each(PART_NAMES)('%s centres each of its movers on its own origin', (name) => {
    for (const mover of pieces(name).movers) {
      mover.geometry.computeBoundingBox();
      const { min, max } = mover.geometry.boundingBox!;
      expect(Math.abs(min.x + max.x)).toBeLessThan(RADIUS * 0.1);
      expect(Math.abs(min.y + max.y)).toBeLessThan(RADIUS * 0.1);
      expect(Math.abs(min.z + max.z)).toBeLessThan(RADIUS * 0.1);
    }
  });

  it('gives the cylinder bank pistons on opposed phases', () => {
    const { movers } = pieces('cylinderBank');
    expect(movers.length).toBeGreaterThanOrEqual(5);
    const phases = movers.map((m) => (m.motion.kind === 'reciprocate' ? m.motion.phase : -1));
    expect(new Set(phases).size).toBe(movers.length);
  });

  it('meshes the gear cluster: neighbours counter-rotate and nearly touch', () => {
    const { movers } = pieces('gearCluster');
    expect(movers.length).toBeGreaterThanOrEqual(4);
    const rates = movers.map((m) => (m.motion.kind === 'spin' ? m.motion.turnsPerSecond : 0));
    for (let i = 1; i < rates.length; i++) expect(Math.sign(rates[i])).toBe(-Math.sign(rates[i - 1]));
    const [a, b] = movers;
    const gap = Math.hypot(a.offset[0] - b.offset[0], a.offset[1] - b.offset[1]);
    a.geometry.computeBoundingSphere();
    expect(gap).toBeLessThanOrEqual(a.geometry.boundingSphere!.radius * 2.2);
  });
});
