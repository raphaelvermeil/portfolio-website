import { describe, expect, it } from 'vitest';
import { ASSEMBLY } from '../assembly';
import { PART_NAMES, buildPart } from './index';

describe('buildPart', () => {
  it('builds every archetype', () => {
    for (const name of PART_NAMES) {
      expect(buildPart(name, 1.2, 'seed').body.getAttribute('position').count).toBeGreaterThan(0);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = buildPart('spokedWheel', 1.1, 'alpha').body.getAttribute('position').array;
    const b = buildPart('spokedWheel', 1.1, 'alpha').body.getAttribute('position').array;
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('varies between seeds', () => {
    const a = buildPart('finnedCollar', 1.1, 'alpha').body.getAttribute('position').count;
    const b = buildPart('finnedCollar', 1.1, 'omega').body.getAttribute('position').count;
    expect(a).not.toBe(b);
  });
});

describe('ASSEMBLY', () => {
  it('names only real archetypes', () => {
    for (const part of ASSEMBLY) expect(PART_NAMES).toContain(part.name);
  });

  it('gives every part a positive radius', () => {
    for (const part of ASSEMBLY) expect(part.radius).toBeGreaterThan(0);
  });

  it('anchors the ends with the largest parts and varies the silhouette', () => {
    const radii = ASSEMBLY.map((p) => p.radius);
    const largest = Math.max(...radii);
    expect(Math.max(radii[radii.length - 1], radii[radii.length - 2])).toBeCloseTo(largest, 1);
    // Neighbouring parts always differ, so the profile never flattens into a tube.
    for (let i = 1; i < radii.length; i++) expect(radii[i]).not.toBe(radii[i - 1]);
  });
});
