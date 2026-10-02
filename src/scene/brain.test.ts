import { describe, expect, it } from 'vitest';
import { FRAME_PARTS, REGIONS } from './brain';
import { projects } from '../lib/data';
import { domeLayout } from './domeLayout';
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
  it('has the six regions, in a stable order', () => {
    expect(REGIONS.map((r) => r.id)).toEqual([
      'logic',
      'learning',
      'vision',
      'motor',
      'language',
      'memory',
    ]);
  });

  it('labels every region and names its domain', () => {
    for (const r of REGIONS) {
      expect(r.label).not.toBe('');
      expect(r.domain).not.toBe('');
      expect(r.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(r.parts.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('names only real builders', () => {
    for (const r of REGIONS) for (const p of r.parts) expect(PART_NAMES).toContain(p.name);
  });

  it('lists only repos that exist and are visible', () => {
    // A typo here would silently filter the grid to nothing, and a hidden repo
    // would make the read-out's count disagree with what the grid shows.
    const visible = new Set(projects.map((p) => p.id));
    for (const r of REGIONS) {
      expect(r.repos.length).toBeGreaterThan(0);
      for (const id of r.repos) {
        expect(visible.has(id), `${r.label} lists ${id}, which is missing or hidden`).toBe(true);
      }
    }
  });

  it('spreads the regions around the dome', () => {
    const azimuths = REGIONS.map((r) => r.azimuth).sort((a, b) => a - b);
    for (let i = 1; i < azimuths.length; i++) {
      expect(azimuths[i] - azimuths[i - 1]).toBeGreaterThanOrEqual(30);
    }
  });

  it('alternates high and low, so neighbours separate in two dimensions', () => {
    for (let i = 1; i < REGIONS.length; i++) {
      const rose = REGIONS[i].elevation > REGIONS[i - 1].elevation;
      const fell = REGIONS[i].elevation < REGIONS[i - 1].elevation;
      expect(rose || fell).toBe(true);
    }
  });

  it('never seats a region below the base ring or on the crown', () => {
    for (const r of REGIONS) {
      expect(r.elevation).toBeGreaterThan(5);
      expect(r.elevation).toBeLessThan(80);
    }
  });

  it('keeps every part small enough that a cluster does not interpenetrate', () => {
    for (const r of REGIONS) {
      for (const p of r.parts) expect(p.radius).toBeLessThan(0.35);
    }
  });

  it('never lets a cluster hang out through the base ring', () => {
    // A cluster reaches CLUSTER below its seat and the seat is only so high, so
    // a region seated too low pokes out underneath the frame. This is the
    // constraint that sets the minimum elevation; it is easy to break by
    // nudging a region down for composition and not noticing from above.
    const layout = domeLayout(
      REGIONS.map((region) => ({
        region: region.id,
        azimuth: region.azimuth,
        elevation: region.elevation,
        parts: region.parts.map((part, i) => ({ id: `${region.id}-${i}`, radius: part.radius })),
      })),
    );
    for (const p of layout.placements) {
      expect(p.assembled[1] - p.radius, `${p.id} dips below the base ring`).toBeGreaterThan(0);
    }
  });
});
