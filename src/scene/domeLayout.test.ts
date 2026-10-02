import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  CRANIUM,
  DOME_RADIUS,
  EXPLODE_GAP,
  CLUSTER_REACH,
  craniumRadiusAt,
  domeLayout,
  seatPosition,
  type LayoutInput,
} from './domeLayout';

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

describe('the cranium is an ovoid, not a hemisphere', () => {
  it('is flatter over the top than it is wide', () => {
    expect(CRANIUM.y).toBeLessThan(CRANIUM.x);
    expect(CRANIUM.y).toBeLessThan(CRANIUM.z);
  });

  it('is longer front-to-back than side-to-side', () => {
    expect(CRANIUM.z).toBeGreaterThan(CRANIUM.x);
  });

  it('measures azimuth from +Z, the same way seatOf does', () => {
    // Azimuth 0 looks down +Z, so it gets the front-to-back semi-axis; a
    // quarter turn away is +X and gets the side-to-side one. These two agreeing
    // is the whole point: a rib and the seats under it must describe one shape.
    expect(craniumRadiusAt(0)).toBeCloseTo(CRANIUM.z, 6);
    expect(craniumRadiusAt(90)).toBeCloseTo(CRANIUM.x, 6);
    expect(craniumRadiusAt(180)).toBeCloseTo(CRANIUM.z, 6);
    const mid = craniumRadiusAt(45);
    expect(mid).toBeGreaterThan(CRANIUM.x);
    expect(mid).toBeLessThan(CRANIUM.z);
  });

  it('agrees with where seatOf actually puts a part', () => {
    // Scale-free on purpose: how far in the seats sit is a private constant,
    // but the *shape* they trace has to be the one the ribs describe.
    const planAt = (azimuth: number) => {
      const [p] = domeLayout([
        { region: 'a', azimuth, elevation: 0, parts: [{ id: 'p', radius: 0.1 }] },
      ]).placements;
      return Math.hypot(p.assembled[0], p.assembled[2]);
    };
    const reference = planAt(0);
    for (const azimuth of [30, 90, 150, 240]) {
      expect(planAt(azimuth) / reference).toBeCloseTo(
        craniumRadiusAt(azimuth) / craniumRadiusAt(0),
        6,
      );
    }
  });

  it('seats parts further out front-to-back than side-to-side', () => {
    const [front] = domeLayout([{ region: 'a', azimuth: 0, elevation: 0, parts: [{ id: 'p', radius: 0.1 }] }]).placements;
    const [side] = domeLayout([{ region: 'b', azimuth: 90, elevation: 0, parts: [{ id: 'q', radius: 0.1 }] }]).placements;
    expect(Math.abs(front.assembled[2])).toBeGreaterThan(Math.abs(side.assembled[0]));
  });
});

describe('clusters fit inside the frame', () => {
  it('leaves every part clear of the ribs', () => {
    // The ceiling on how far out seats may sit. Breached, clusters poke through
    // the shell, which from overhead looks fine and from the side does not.
    const layout = domeLayout([
      { region: 'a', azimuth: 0, elevation: 38, parts: [{ id: 'p', radius: 0.34 }] },
      { region: 'b', azimuth: 90, elevation: 56, parts: [{ id: 'q', radius: 0.34 }] },
    ]);
    for (const p of layout.placements) {
      const reach = new Vector3(...p.assembled).length() + p.radius + CLUSTER_REACH;
      expect(reach).toBeLessThan(DOME_RADIUS * CRANIUM.z);
    }
  });
});
