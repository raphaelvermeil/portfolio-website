import { describe, expect, it } from 'vitest';
import { ASSEMBLY } from '../assembly';
import { PART_NAMES, buildPart } from './index';

describe('buildPart', () => {
  it('builds every layer form', () => {
    for (const name of PART_NAMES) {
      expect(buildPart(name, 1.2, 'seed').body.getAttribute('position').count).toBeGreaterThan(0);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = buildPart('modelLattice', 1.1, 'alpha').body.getAttribute('position').array;
    const b = buildPart('modelLattice', 1.1, 'alpha').body.getAttribute('position').array;
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('varies between seeds', () => {
    const a = buildPart('modelLattice', 1.1, 'alpha').body.getAttribute('position').count;
    const b = buildPart('modelLattice', 1.1, 'omega').body.getAttribute('position').count;
    expect(a).not.toBe(b);
  });
});

describe('ASSEMBLY', () => {
  it('names only real layer forms', () => {
    for (const layer of ASSEMBLY) expect(PART_NAMES).toContain(layer.name);
  });

  it('gives every layer a unique id and form', () => {
    expect(new Set(ASSEMBLY.map((l) => l.id)).size).toBe(ASSEMBLY.length);
    expect(new Set(ASSEMBLY.map((l) => l.name)).size).toBe(ASSEMBLY.length);
  });

  it('labels every layer and names what occupies it', () => {
    for (const layer of ASSEMBLY) {
      expect(layer.label).not.toBe('');
      expect(layer.tech.length).toBeGreaterThan(0);
      expect(layer.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(layer.radius).toBeGreaterThan(0);
    }
  });

  /**
   * Index 0 sits at the far -Y end, so the array runs foundation upward. The
   * order is the argument the drawing makes: delivery carries the data, the
   * models sit on the data, the services above them, the interface on top.
   */
  it('runs bottom-up from delivery to interface', () => {
    expect(ASSEMBLY.map((l) => l.id)).toEqual(['delivery', 'data', 'models', 'services', 'interface']);
  });

  it('never spins a layer, because a stack that turns reads as a machine again', () => {
    for (const layer of ASSEMBLY) {
      expect(layer.motion.kind).not.toBe('spin');
      expect(layer.motion.kind).not.toBe('tick');
    }
  });

  it('varies the radii so the silhouette never flattens into a tube', () => {
    const radii = ASSEMBLY.map((l) => l.radius);
    for (let i = 1; i < radii.length; i++) expect(radii[i]).not.toBe(radii[i - 1]);
  });

  it('widens toward the surface, so the stack reads as resting on its base', () => {
    const radii = ASSEMBLY.map((l) => l.radius);
    expect(radii).toEqual([...radii].sort((a, b) => a - b));
  });
});
