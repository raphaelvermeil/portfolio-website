import { describe, expect, it } from 'vitest';
import { FRAME_PARTS, REGIONS } from './brain';
import { PART_NAMES } from './parts';

describe('the cranial frame', () => {
  it('names only real builders', () => {
    for (const part of FRAME_PARTS) expect(PART_NAMES).toContain(part.name);
  });

  it('gives every frame part a unique id', () => {
    expect(new Set(FRAME_PARTS.map((p) => p.id)).size).toBe(FRAME_PARTS.length);
  });

  it('spaces the ribs over a half turn, since a rib is a full meridian', () => {
    const ribs = FRAME_PARTS.filter((p) => p.name === 'domeRib');
    expect(ribs.length).toBeGreaterThanOrEqual(6);
    for (const rib of ribs) expect(rib.azimuth).toBeLessThan(180);
    // Evenly spaced, or the dome is lopsided.
    const gaps = ribs.slice(1).map((r, i) => r.azimuth - ribs[i].azimuth);
    for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0], 6);
  });

  it('has a base ring and a crown', () => {
    expect(FRAME_PARTS.some((p) => p.name === 'mountingRing')).toBe(true);
    expect(FRAME_PARTS.some((p) => p.name === 'crownPlate')).toBe(true);
  });
});

describe('REGIONS', () => {
  it('is empty until the frame is confirmed to read as a cranium', () => {
    expect(REGIONS).toEqual([]);
  });
});
