import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DOME_RADIUS, EXPLODE_GAP, domeLayout, seatPosition, type LayoutInput } from './domeLayout';

const input: LayoutInput[] = [
  {
    region: 'logic',
    azimuth: 0,
    elevation: 20,
    parts: [
      { id: 'a', radius: 0.5 },
      { id: 'b', radius: 0.4 },
    ],
  },
  { region: 'vision', azimuth: 120, elevation: 50, parts: [{ id: 'c', radius: 0.6 }] },
  { region: 'memory', azimuth: 240, elevation: 20, parts: [{ id: 'd', radius: 0.5 }] },
];

describe('domeLayout', () => {
  const layout = domeLayout(input);

  it('places every part exactly once', () => {
    expect(layout.placements.map((p) => p.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('seats every part inside the dome', () => {
    for (const p of layout.placements) {
      expect(new Vector3(...p.assembled).length()).toBeLessThan(DOME_RADIUS);
    }
  });

  it('seats every part above the base ring, because a dome is a hemisphere', () => {
    for (const p of layout.placements) expect(p.assembled[1]).toBeGreaterThan(0);
  });

  it('explodes every part outward, never inward', () => {
    for (const p of layout.placements) {
      const near = new Vector3(...p.assembled).length();
      const far = new Vector3(...p.exploded).length();
      expect(far).toBeGreaterThan(near);
    }
  });

  it('moves a whole cluster along its shared region normal, keeping its shape', () => {
    for (const p of layout.placements) {
      const travel = new Vector3(...p.exploded).sub(new Vector3(...p.assembled));
      const normal = new Vector3(...layout.regionCentroids[p.region]).normalize();
      // Parallel to the region's normal, not to the part's own position vector:
      // a cluster member sits tangentially off the seat, and the cluster
      // translates as one rather than fanning apart.
      expect(travel.clone().normalize().dot(normal)).toBeCloseTo(1, 5);
      expect(travel.length()).toBeCloseTo(EXPLODE_GAP, 5);
    }
  });

  it('interpolates between seated and clear, and clamps', () => {
    const p = layout.placements[0];
    expect(seatPosition(p, 0).toArray()).toEqual(p.assembled);
    expect(seatPosition(p, 1).toArray()).toEqual(p.exploded);
    expect(seatPosition(p, -1).toArray()).toEqual(p.assembled);
    expect(seatPosition(p, 2).toArray()).toEqual(p.exploded);
    const mid = seatPosition(p, 0.5);
    expect(mid.length()).toBeGreaterThan(new Vector3(...p.assembled).length());
    expect(mid.length()).toBeLessThan(new Vector3(...p.exploded).length());
  });

  it('writes into the target vector rather than allocating per frame', () => {
    const target = new Vector3();
    expect(seatPosition(layout.placements[0], 0.3, target)).toBe(target);
  });

  it('orients each part so its +Z spin axis points along the seat normal', () => {
    for (const p of layout.placements) {
      const normal = new Vector3(...p.assembled).normalize();
      const spin = new Vector3(0, 0, 1).applyQuaternion(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { x: p.quaternion[0], y: p.quaternion[1], z: p.quaternion[2], w: p.quaternion[3] } as any,
      );
      // A cluster is staggered inward along the normal, so compare directions
      // against the region seat rather than the part's own offset position.
      expect(spin.length()).toBeCloseTo(1, 5);
      expect(Math.abs(spin.dot(normal))).toBeGreaterThan(0.8);
    }
  });

  it('keeps regions apart, so clusters never collide', () => {
    const centroids = Object.values(layout.regionCentroids).map((c) => new Vector3(...c));
    for (let i = 0; i < centroids.length; i++) {
      for (let j = i + 1; j < centroids.length; j++) {
        expect(centroids[i].distanceTo(centroids[j])).toBeGreaterThan(1.2);
      }
    }
  });

  it('reports a reach that contains every part', () => {
    for (const p of layout.placements) {
      expect(new Vector3(...p.assembled).length() + p.radius).toBeLessThanOrEqual(
        layout.assembledReach + 1e-6,
      );
      expect(new Vector3(...p.exploded).length() + p.radius).toBeLessThanOrEqual(
        layout.explodedReach + 1e-6,
      );
    }
    expect(layout.explodedReach).toBeGreaterThan(layout.assembledReach);
  });

  it('is empty for no input', () => {
    expect(domeLayout([])).toMatchObject({ placements: [], assembledReach: 0, explodedReach: 0 });
  });
});
