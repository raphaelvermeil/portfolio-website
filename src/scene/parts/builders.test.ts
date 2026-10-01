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

function box(geometry: ReturnType<typeof build>) {
  geometry.computeBoundingBox();
  return geometry.boundingBox!;
}

describe('layer builders', () => {
  it('exposes one form per layer of the stack', () => {
    expect(PART_NAMES).toHaveLength(5);
    expect(new Set(PART_NAMES).size).toBe(PART_NAMES.length);
  });

  it.each(PART_NAMES)('%s produces non-empty geometry', (name) => {
    expect(build(name).getAttribute('position').count).toBeGreaterThan(0);
  });

  it.each(PART_NAMES)('%s stays within the radius the layout reserved', (name) => {
    const g = build(name);
    g.computeBoundingSphere();
    // A square plate's corners reach radius·√2·PLATE ≈ 1.02R, which the camera's
    // framing margin absorbs. Much beyond that and the corners clip out of frame.
    expect(g.boundingSphere!.radius).toBeLessThanOrEqual(RADIUS * 1.1);
    expect(g.boundingSphere!.radius).toBeGreaterThan(RADIUS * 0.45);
  });

  it.each(PART_NAMES)('%s is centred on the origin', (name) => {
    const { min, max } = box(build(name));
    expect(Math.abs(min.x + max.x)).toBeLessThan(RADIUS * 0.1);
    expect(Math.abs(min.y + max.y)).toBeLessThan(RADIUS * 0.1);
    expect(Math.abs(min.z + max.z)).toBeLessThan(RADIUS * 0.1);
  });

  it.each(PART_NAMES)('%s is a layer: far flatter along the stack axis than it is wide', (name) => {
    const { min, max } = box(build(name));
    // Not merely flatter — a layer has to read as a slab, or the stack looks like
    // a column of blocks and the whole point of the shape is lost.
    expect(max.z - min.z).toBeLessThan((max.x - min.x) * 0.5);
  });

  it.each(PART_NAMES)('%s is deterministic for a given seed', (name) => {
    expect(Array.from(build(name).getAttribute('position').array)).toEqual(
      Array.from(build(name).getAttribute('position').array),
    );
  });

  it('varies with the seed where a layer has a free count', () => {
    const a = build('modelLattice', 1).getAttribute('position').count;
    const b = build('modelLattice', 99).getAttribute('position').count;
    expect(a).not.toBe(b);
  });

  it('scales with radius', () => {
    const small = toPieces(BUILDERS.interfacePlate(0.6, mulberry32(3))).body;
    const large = toPieces(BUILDERS.interfacePlate(1.6, mulberry32(3))).body;
    small.computeBoundingSphere();
    large.computeBoundingSphere();
    expect(large.boundingSphere!.radius).toBeGreaterThan(small.boundingSphere!.radius * 2);
  });

  it.each(PART_NAMES)('%s centres each of its movers on its own origin', (name) => {
    for (const mover of pieces(name).movers) {
      const { min, max } = box(mover.geometry);
      expect(Math.abs(min.x + max.x)).toBeLessThan(RADIUS * 0.1);
      expect(Math.abs(min.y + max.y)).toBeLessThan(RADIUS * 0.1);
      expect(Math.abs(min.z + max.z)).toBeLessThan(RADIUS * 0.1);
    }
  });

  it.each(PART_NAMES)('%s gives every mover somewhere to move', (name) => {
    const { movers } = pieces(name);
    expect(movers.length).toBeGreaterThan(0);
    for (const mover of movers) {
      const travel = mover.motion.kind === 'reciprocate' ? mover.motion.travel : Infinity;
      expect(travel).toBeGreaterThan(0);
    }
  });

  /**
   * merge() recentres the body on its bounding box, and a layer built upward off
   * a base plate is never symmetric about it. assemble() shifts the movers to
   * match; without that they float off their mountings by however far the body
   * moved, which is subtle enough on screen to survive a visual check.
   */
  it('keeps movers flush with the body after recentring', () => {
    const { body, movers } = pieces('interfacePlate');
    const top = box(body).max.z;
    for (const mover of movers) {
      const half = box(mover.geometry).max.z;
      expect(mover.offset[2] + half).toBeCloseTo(top, 5);
    }
  });

  it('lifts the interface content tiles on opposed beats', () => {
    const { movers } = pieces('interfacePlate');
    expect(movers).toHaveLength(2);
    const phases = movers.map((m) => (m.motion.kind === 'reciprocate' ? m.motion.phase : -1));
    expect(new Set(phases).size).toBe(movers.length);
  });

  it('sends a pulse outward through the model lattice', () => {
    const { movers } = pieces('modelLattice');
    expect(movers).toHaveLength(3);
    const phases = movers.map((m) => (m.motion.kind === 'reciprocate' ? m.motion.phase : -1));
    // Ascending phases, so each rank rises after the one inside it.
    expect(phases).toEqual([...phases].sort((a, b) => a - b));
    expect(new Set(phases).size).toBe(phases.length);
    // Ranks are concentric, so they share a mounting and differ only in radius.
    const radii = movers.map((m) => {
      m.geometry.computeBoundingSphere();
      return m.geometry.boundingSphere!.radius;
    });
    expect(radii).toEqual([...radii].sort((a, b) => a - b));
  });

  it('turns the top platter of the data layer', () => {
    const { movers } = pieces('dataDiscs');
    expect(movers).toHaveLength(1);
    expect(movers[0].motion.kind).toBe('spin');
  });
});
