# Mechanical Brain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the layered-stack 3D subject with a cranial assembly — a ribbed dome frame holding six labelled mechanical regions that separate radially and wake as the viewer interacts.

**Architecture:** The scene engine is kept. The single architectural change is that a part's placement becomes a **point** (`seatPosition → Vector3`) rather than a scalar offset on one axis, so `axisLayout.ts` is replaced by `domeLayout.ts`. Parts are seated on an inner hemisphere at hand-authored spherical coordinates, grouped into six regions, and explode along their own outward normal.

**Tech Stack:** Vite 8, React 19.2, TypeScript 5.9, three.js 0.186, @react-three/fiber 9.7, @react-three/drei 10.7, zustand 5, Vitest 5, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-01-mechanical-brain-design.md`

## Global Constraints

- **Simplest possible implementation.** No speculative abstraction (`CLAUDE.md`).
- **Least amount of changes possible.** Smallest diff that works; do not refactor, rename, or touch unrelated code (`CLAUDE.md`).
- **Ask before implementing edge cases.** Build the happy path, then stop and ask (`CLAUDE.md`).
- Every labelled thing on screen must say something **true and checkable** against the project grid (spec §1).
- Do **not** rename `machine.ts`, `MachineScene.tsx`, `Gear.tsx`, the `.machine` CSS class or the `#machine` anchor (spec §11).
- Geometry invariants, enforced by existing tests: every builder returns geometry **centred on the origin** with its spin axis **+Z**; movers are centred on their own origin; builders are deterministic per seed.
- `RADIAL_SEGMENTS = 36` and `EDGE_THRESHOLD_DEG = 24` are a pair — curved surfaces need facets below 24° or every seam is drawn.
- Branch: `redesign/mechanical-brain`. Commit after every task.
- Verify visually with `node --experimental-websocket <scratchpad>/shot.mjs <url> <out.png> 1440 900 p<progress>` against `npx vite preview`. Node 20 needs `--experimental-websocket`.

### Correction to the spec

Spec §4.2 lists `cameraPath.ts` as untouched. That is wrong and **Task 8 fixes it**. `framingDistance` is genuinely sphere-correct (verified: with `length = 0` it returns an identical distance from every pose). But its caller `cameraStateFor` interpolates *length* while holding *diameter* fixed, and a brain grows in diameter as it explodes. One optional `explodedDiameter` field is added and interpolated by `axialProgress`.

### Shared types (used across tasks — define once in Task 4)

```ts
// src/scene/brain.ts
export type RegionId = 'logic' | 'learning' | 'vision' | 'motor' | 'language' | 'memory';

export interface RegionPart {
  name: PartName;
  radius: number;
  motion: PartMotion;
}

export interface BrainRegion {
  id: RegionId;
  label: string;
  domain: string;
  color: string;
  /** Repo ids this region's work lives in. Must exist and must not be hidden. */
  repos: string[];
  /** Seat on the dome, in degrees. azimuth about +Y, elevation up from the XZ plane. */
  azimuth: number;
  elevation: number;
  parts: RegionPart[];
}
```

```ts
// src/scene/domeLayout.ts
export interface SeatPlacement {
  id: string;
  region: RegionId | 'frame';
  assembled: [number, number, number];
  exploded: [number, number, number];
  quaternion: [number, number, number, number];
  radius: number;
}
```

---

## File Structure

| File | Responsibility |
|---|---|
| `src/scene/parts/builders.ts` | The 18 restored archetypes + 3 frame builders + helpers |
| `src/scene/domeLayout.ts` | **NEW** Seats parts on the dome; radial explode; region centroids |
| `src/scene/brain.ts` | **NEW** The design: six regions, their parts, seats, repos |
| `src/scene/machine.ts` | Builds each part once, measures, calls `domeLayout` |
| `src/scene/Gear.tsx` | Renders one part; reads a **point** not a scalar |
| `src/scene/skillParts.ts` | Region label plan and escape directions |
| `src/scene/SkillCallouts.tsx` | Labels anchored to region centroids |
| `src/scene/timeline.ts` | Act spans (re-timed in Task 8) |
| `src/scene/cameraPath.ts` | `explodedDiameter` option (Task 8) |
| `src/lib/regionRepos.ts` | **NEW** Resolves a region's repo ids to projects |
| `src/lib/store.ts` | Adds the waking level |
| `src/ui/SkillsPanel.tsx` | Lists regions and their repo counts |
| `src/ui/sections/Projects.tsx` | Filters the grid by selected region |
| `src/scene/axisLayout.ts` | **DELETE** |
| `src/scene/assembly.ts` | **DELETE** |
| `src/lib/layerRepos.ts` | **DELETE** |

---

## Task 1: Restore the 18 archetypes

**Files:**
- Modify: `src/scene/parts/builders.ts` (full replacement)
- Modify: `src/scene/parts/builders.test.ts` (full replacement)

**Interfaces:**
- Consumes: nothing.
- Produces: `BUILDERS` with 18 archetypes (`spurGear`, `ringGear`, `knurledCollar`, `lensBarrel`, `bearing`, `boltedFlange`, `turbineHub`, `spacerRing`, `spokedWheel`, `castellatedCrown`, `cylinderBank`, `finnedCollar`, `hexBoss`, `lobedCam`, `slottedDisc`, `retainingRing`, `lensGroup`, `gearCluster`); `PartName`; `PART_NAMES`; `toPieces`; and the helpers `assemble(parts, movers)` and `block(w,h,d,x,y,z)`.

- [ ] **Step 1: Restore the gear-era file and its test**

```bash
git checkout feat/parts-library -- src/scene/parts/builders.ts src/scene/parts/builders.test.ts src/scene/gearGeometry.ts src/scene/gearGeometry.test.ts
```

- [ ] **Step 2: Run the tests to see them pass as restored**

Run: `npx vitest run src/scene/parts/builders.test.ts`
Expected: PASS. (Other suites are broken at this point — that is fine, later tasks fix them.)

- [ ] **Step 3: Add `assemble()` and `block()`, which the frame builders need**

These are the two helpers worth keeping from the stack design. Add to `src/scene/parts/builders.ts` — `assemble` directly after `merge`, `block` after `atAngle`. Add `Box3` and `Vector3` to the `three` import.

```ts
/**
 * Builds a part from body pieces and movers laid out in one design space.
 *
 * `merge` recentres the body on its bounding box, which a form built upward off
 * a base is never symmetric about. The movers are positioned in the same space,
 * so they take the identical shift — otherwise they float off their mountings
 * by however far the body moved.
 */
function assemble(parts: BufferGeometry[], movers: Mover[]): PartPieces {
  const box = new Box3();
  for (const part of parts) {
    part.computeBoundingBox();
    box.union(part.boundingBox!);
  }
  const centre = box.getCenter(new Vector3());
  return {
    body: merge(parts),
    movers: movers.map((mover) => ({
      ...mover,
      offset: [
        mover.offset[0] - centre.x,
        mover.offset[1] - centre.y,
        mover.offset[2] - centre.z,
      ],
    })),
  };
}

/** A box placed in a part's design space. */
function block(w: number, h: number, d: number, x: number, y: number, z: number): BufferGeometry {
  const geometry = new BoxGeometry(w, h, d);
  geometry.translate(x, y, z);
  return geometry;
}
```

- [ ] **Step 4: Add the alignment test that `assemble` exists to guarantee**

Append to `src/scene/parts/builders.test.ts`:

```ts
describe('assemble', () => {
  it('keeps movers flush with the body after recentring', () => {
    // cylinderBank is built symmetrically, so this is a regression guard for the
    // frame builders in Task 2, which are not.
    const { body, movers } = toPieces(BUILDERS.cylinderBank(1.2, mulberry32(7)));
    body.computeBoundingBox();
    const top = body.boundingBox!.max.z;
    for (const mover of movers) {
      mover.geometry.computeBoundingBox();
      expect(mover.offset[2] + mover.geometry.boundingBox!.max.z).toBeLessThanOrEqual(top + 0.5);
    }
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/scene/parts/builders.test.ts`
Expected: PASS, 18 archetypes covered.

- [ ] **Step 6: Commit**

```bash
git add src/scene/parts/ src/scene/gearGeometry.ts src/scene/gearGeometry.test.ts
git commit -m "feat: restore the 18 mechanical archetypes for the brain"
```

---

## Task 2: The dome frame builders — `domeRib`, `mountingRing`, `crownPlate`

**Files:**
- Modify: `src/scene/parts/builders.ts`
- Modify: `src/scene/parts/builders.test.ts`

**Interfaces:**
- Consumes: `assemble`, `block`, `merge`, `ring`, `atAngle`, `toZAxis`, `lathe`, `between`, `countBetween`, `RADIAL_SEGMENTS` from Task 1.
- Produces: three new entries in `BUILDERS` — `domeRib`, `mountingRing`, `crownPlate`. `PART_NAMES.length === 21`.

**Context:** These three make the silhouette read as a cranium. Unlike the archetypes they are **not** flat discs — a rib is tall and thin. The existing "flatter along Z than wide" test must therefore skip them.

- [ ] **Step 1: Write the failing tests**

Append to `src/scene/parts/builders.test.ts`:

```ts
const FRAME: (keyof typeof BUILDERS)[] = ['domeRib', 'mountingRing', 'crownPlate'];

describe('dome frame', () => {
  it('adds exactly three frame builders', () => {
    expect(PART_NAMES).toHaveLength(21);
    for (const name of FRAME) expect(PART_NAMES).toContain(name);
  });

  it('makes the rib an arc: tall in Y, thin in Z, narrow in X', () => {
    const g = toPieces(BUILDERS.domeRib(1.2, mulberry32(4))).body;
    g.computeBoundingBox();
    const { min, max } = g.boundingBox!;
    const [x, y, z] = [max.x - min.x, max.y - min.y, max.z - min.z];
    expect(y).toBeGreaterThan(z * 3);
    expect(x).toBeGreaterThan(z);
  });

  it('makes the mounting ring an annulus with a hole', () => {
    const g = toPieces(BUILDERS.mountingRing(1.2, mulberry32(4))).body;
    g.computeBoundingBox();
    const { min, max } = g.boundingBox!;
    // Wide and flat, like the retaining rings.
    expect(max.z - min.z).toBeLessThan((max.x - min.x) * 0.3);
  });
});
```

- [ ] **Step 2: Exempt the frame from the flat-disc invariant**

In `src/scene/parts/builders.test.ts`, change the existing flatness test to skip frame parts:

```ts
it.each(PART_NAMES)('%s is flatter along the spin axis than it is wide', (name) => {
  // A dome rib is an arc, not a disc: it is deliberately tall.
  if (FRAME.includes(name)) return;
  const g = build(name);
  g.computeBoundingBox();
  const { min, max } = g.boundingBox!;
  expect(max.z - min.z).toBeLessThan(max.x - min.x);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/scene/parts/builders.test.ts`
Expected: FAIL — `Property 'domeRib' does not exist on type`.

- [ ] **Step 4: Implement the three builders**

Add to `src/scene/parts/builders.ts` before the `BUILDERS` object:

```ts
/**
 * One meridian rib of the cranium, swept from the base ring up to the crown.
 *
 * Built in the XY plane so the arc stands up, which is what makes the dome read
 * as a cranium rather than a bowl. `radius` is the dome's radius, not the rib's
 * own extent.
 */
export const domeRib: PartBuilder = (radius, rand) => {
  const thickness = radius * between(rand, 0.04, 0.055);
  const depth = radius * 0.07;
  const steps = 14;
  const segments: BufferGeometry[] = [];
  // Chord segments approximating a quarter arc from (radius, 0) to (0, radius).
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * (Math.PI / 2);
    const a1 = ((i + 1) / steps) * (Math.PI / 2);
    const x0 = Math.cos(a0) * radius;
    const y0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius;
    const y1 = Math.sin(a1) * radius;
    const len = Math.hypot(x1 - x0, y1 - y0);
    const piece = new BoxGeometry(len + thickness * 0.4, thickness, depth);
    piece.applyMatrix4(
      new Matrix4()
        .makeTranslation((x0 + x1) / 2, (y0 + y1) / 2, 0)
        .multiply(new Matrix4().makeRotationZ(Math.atan2(y1 - y0, x1 - x0))),
    );
    segments.push(piece);
  }
  return merge(segments);
};

/** The ring the ribs land on, carrying a circle of bolt bosses. */
export const mountingRing: PartBuilder = (radius, rand) => {
  const band = radius * 0.1;
  const depth = radius * 0.07;
  const body = lathe(
    [
      [radius - band, -depth / 2],
      [radius, -depth / 2],
      [radius, depth / 2],
      [radius - band, depth / 2],
      [radius - band, -depth / 2],
    ],
    RADIAL_SEGMENTS,
  );
  const bolts = countBetween(rand, 10, 14);
  const boss = toZAxis(new CylinderGeometry(radius * 0.028, radius * 0.028, depth * 1.6, 10));
  return merge([body, ...ring(bolts, boss, (a) => atAngle(a, radius - band / 2))]);
};

/** A small bolted cap closing the crown where the ribs converge. */
export const crownPlate: PartBuilder = (radius, rand) => {
  const depth = radius * between(rand, 0.1, 0.14);
  const disc = toZAxis(new CylinderGeometry(radius, radius * 0.86, depth, RADIAL_SEGMENTS));
  const collar = toZAxis(new CylinderGeometry(radius * 0.4, radius * 0.4, depth * 1.7, 18));
  const bolts = countBetween(rand, 5, 7);
  const boss = toZAxis(new CylinderGeometry(radius * 0.09, radius * 0.09, depth * 1.3, 10));
  return merge([disc, collar, ...ring(bolts, boss, (a) => atAngle(a, radius * 0.66))]);
};
```

Add all three to `BUILDERS`.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/scene/parts/builders.test.ts`
Expected: PASS, 21 builders.

- [ ] **Step 6: Commit**

```bash
git add src/scene/parts/
git commit -m "feat: dome frame builders — rib, mounting ring, crown plate"
```

---

## Task 3: `domeLayout.ts` — seat parts on the dome

**Files:**
- Create: `src/scene/domeLayout.ts`
- Create: `src/scene/domeLayout.test.ts`

**Interfaces:**
- Consumes: `RegionId` (declare locally as a string union here; Task 4 re-exports the canonical one from `brain.ts` and this file imports it then — to avoid a circular import, `domeLayout.ts` must **not** import from `brain.ts`; it takes plain data).
- Produces:
  - `seatPosition(placement: SeatPlacement, explode: number, target?: Vector3): Vector3`
  - `domeLayout(input: LayoutInput[]): DomeLayout`
  - `DOME_RADIUS`, `EXPLODE_GAP`
  - types `SeatPlacement`, `LayoutInput`, `DomeLayout`

**Context:** This replaces `axisLayout.ts`. The dome's crown is at **+Y**, its base ring in the XZ plane, because the scene's up is world +Y. A part's seat is on an inner sphere of radius `DOME_RADIUS * INNER`; its spin axis points along the outward normal; it explodes along that same normal.

- [ ] **Step 1: Write the failing tests**

Create `src/scene/domeLayout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DOME_RADIUS, domeLayout, seatPosition, type LayoutInput } from './domeLayout';

const input: LayoutInput[] = [
  { region: 'logic', azimuth: 0, elevation: 20, parts: [{ id: 'a', radius: 0.5 }, { id: 'b', radius: 0.4 }] },
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

  it('explodes along the part own seat normal, so the fan reads as one assembly', () => {
    for (const p of layout.placements) {
      const seat = new Vector3(...p.assembled).normalize();
      const out = new Vector3(...p.exploded).normalize();
      expect(seat.dot(out)).toBeCloseTo(1, 5);
    }
  });

  it('interpolates between the two, and clamps', () => {
    const p = layout.placements[0];
    expect(seatPosition(p, 0).toArray()).toEqual(p.assembled);
    expect(seatPosition(p, 1).toArray()).toEqual(p.exploded);
    const mid = seatPosition(p, 0.5);
    expect(mid.length()).toBeGreaterThan(new Vector3(...p.assembled).length());
    expect(mid.length()).toBeLessThan(new Vector3(...p.exploded).length());
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
      expect(new Vector3(...p.assembled).length() + p.radius).toBeLessThanOrEqual(layout.assembledReach + 1e-6);
      expect(new Vector3(...p.exploded).length() + p.radius).toBeLessThanOrEqual(layout.explodedReach + 1e-6);
    }
    expect(layout.explodedReach).toBeGreaterThan(layout.assembledReach);
  });

  it('is empty for no input', () => {
    expect(domeLayout([])).toMatchObject({ placements: [], assembledReach: 0, explodedReach: 0 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/scene/domeLayout.test.ts`
Expected: FAIL — cannot resolve `./domeLayout`.

- [ ] **Step 3: Implement**

Create `src/scene/domeLayout.ts`:

```ts
import { Quaternion, Vector3 } from 'three';

/** Radius of the cranial frame. Parts are seated inside it. */
export const DOME_RADIUS = 3.2;
/** How far a part travels outward when the assembly opens. */
export const EXPLODE_GAP = 2.3;
/** Seats sit on this fraction of the dome radius, so parts live under the ribs. */
const INNER = 0.62;
/** Radius of the ring a region's parts are arranged in, around its seat. */
const CLUSTER = 0.62;
/** Each part in a cluster sits slightly deeper than the last. */
const STAGGER = 0.16;

const PART_AXIS = new Vector3(0, 0, 1);
const UP = new Vector3(0, 1, 0);
const rad = (deg: number) => (deg * Math.PI) / 180;

export interface LayoutPart {
  id: string;
  radius: number;
}

export interface LayoutInput {
  region: string;
  /** Degrees about +Y. */
  azimuth: number;
  /** Degrees up from the XZ plane. */
  elevation: number;
  parts: LayoutPart[];
}

export interface SeatPlacement {
  id: string;
  region: string;
  assembled: [number, number, number];
  exploded: [number, number, number];
  quaternion: [number, number, number, number];
  radius: number;
}

export interface DomeLayout {
  placements: SeatPlacement[];
  regionCentroids: Record<string, [number, number, number]>;
  /** Furthest any part reaches from the centre, closed up and opened out. */
  assembledReach: number;
  explodedReach: number;
}

/** Where a part sits for a given explode factor, 0 (seated) to 1 (clear). */
export function seatPosition(
  placement: SeatPlacement,
  explode: number,
  target = new Vector3(),
): Vector3 {
  const t = Math.min(1, Math.max(0, explode));
  const [ax, ay, az] = placement.assembled;
  const [ex, ey, ez] = placement.exploded;
  return target.set(ax + (ex - ax) * t, ay + (ey - ay) * t, az + (ez - az) * t);
}

/** The point on the inner dome at a given azimuth and elevation. */
function seatOf(azimuth: number, elevation: number): Vector3 {
  const a = rad(azimuth);
  const e = rad(elevation);
  return new Vector3(
    Math.cos(e) * Math.sin(a),
    Math.sin(e),
    Math.cos(e) * Math.cos(a),
  ).multiplyScalar(DOME_RADIUS * INNER);
}

export function domeLayout(input: LayoutInput[]): DomeLayout {
  const placements: SeatPlacement[] = [];
  const regionCentroids: Record<string, [number, number, number]> = {};
  let assembledReach = 0;
  let explodedReach = 0;

  for (const region of input) {
    const seat = seatOf(region.azimuth, region.elevation);
    const normal = seat.clone().normalize();
    regionCentroids[region.region] = [seat.x, seat.y, seat.z];

    // A basis in the plane tangent to the dome at this seat, so a cluster lies
    // flat against the shell rather than cutting through it.
    const t1 = new Vector3().crossVectors(UP, normal);
    if (t1.lengthSq() < 1e-6) t1.set(1, 0, 0);
    t1.normalize();
    const t2 = new Vector3().crossVectors(normal, t1).normalize();

    const quaternion = new Quaternion().setFromUnitVectors(PART_AXIS, normal);
    const q: [number, number, number, number] = [quaternion.x, quaternion.y, quaternion.z, quaternion.w];

    region.parts.forEach((part, i) => {
      const spread = region.parts.length === 1 ? 0 : CLUSTER;
      const angle = (i / Math.max(1, region.parts.length)) * Math.PI * 2;
      const assembled = seat
        .clone()
        .addScaledVector(t1, Math.cos(angle) * spread)
        .addScaledVector(t2, Math.sin(angle) * spread)
        .addScaledVector(normal, -i * STAGGER);
      const exploded = assembled.clone().addScaledVector(normal, EXPLODE_GAP);

      placements.push({
        id: part.id,
        region: region.region,
        assembled: [assembled.x, assembled.y, assembled.z],
        exploded: [exploded.x, exploded.y, exploded.z],
        quaternion: q,
        radius: part.radius,
      });
      assembledReach = Math.max(assembledReach, assembled.length() + part.radius);
      explodedReach = Math.max(explodedReach, exploded.length() + part.radius);
    });
  }

  return { placements, regionCentroids, assembledReach, explodedReach };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/scene/domeLayout.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/scene/domeLayout.ts src/scene/domeLayout.test.ts
git commit -m "feat: dome layout — seat parts on a hemisphere, explode radially"
```

---

## Task 4: The bare dome on screen — **KILL SWITCH**

**This task exists to answer one question cheaply: does the frame read as a cranium?** Nothing downstream is built until the still is approved. If it does not read, the design is abandoned having spent three builders and a layout file.

**Files:**
- Create: `src/scene/brain.ts`
- Create: `src/scene/brain.test.ts`
- Modify: `src/scene/machine.ts` (full replacement)
- Modify: `src/scene/Gear.tsx` (3 edits)
- Modify: `src/scene/MachineScene.tsx` (2 edits)
- Modify: `src/scene/SkillCallouts.tsx` (1 edit)
- Delete: `src/scene/axisLayout.ts`, `src/scene/axisLayout.test.ts`, `src/scene/assembly.ts`

**Interfaces:**
- Consumes: `domeLayout`, `seatPosition`, `SeatPlacement` (Task 3); `BUILDERS`, `PartName` (Tasks 1–2).
- Produces: `REGIONS: BrainRegion[]`, `regionById`, `FRAME_PARTS`, `RegionId`, `BrainRegion`, `RegionPart` from `brain.ts`; `partById`, `placements`, `placementById`, `regionCentroids`, `assembledReach`, `explodedReach`, `brainDiameter`, `explodedDiameter`, `motionById` from `machine.ts`.

- [ ] **Step 1: Write `brain.ts` with the frame only, regions empty**

```ts
import type { PartMotion } from './motion';
import type { PartName } from './parts';

export type RegionId = 'logic' | 'learning' | 'vision' | 'motor' | 'language' | 'memory';

export interface RegionPart {
  name: PartName;
  radius: number;
  motion: PartMotion;
}

export interface BrainRegion {
  id: RegionId;
  label: string;
  domain: string;
  color: string;
  /** Repo ids this region's work lives in. Must exist and must not be hidden. */
  repos: string[];
  /** Seat on the dome, in degrees: azimuth about +Y, elevation up from the XZ plane. */
  azimuth: number;
  elevation: number;
  parts: RegionPart[];
}

/**
 * The cranial frame. Not a region: it carries no label and does not explode,
 * so the regions separate out of something that stays put.
 */
export interface FramePart {
  id: string;
  name: PartName;
  radius: number;
  /** Degrees about +Y; ribs are spaced around the dome. */
  azimuth: number;
}

const RIBS = 8;

export const FRAME_PARTS: FramePart[] = [
  ...Array.from({ length: RIBS }, (_, i) => ({
    id: `rib-${i}`,
    name: 'domeRib' as PartName,
    radius: 3.2,
    azimuth: (i / RIBS) * 180,
  })),
  { id: 'base', name: 'mountingRing', radius: 3.2, azimuth: 0 },
  { id: 'crown', name: 'crownPlate', radius: 0.55, azimuth: 0 },
];

/** Populated in Task 5. */
export const REGIONS: BrainRegion[] = [];

export const regionById: Record<string, BrainRegion> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r]),
);
```

- [ ] **Step 2: Write `machine.ts` to build the frame and lay it out**

Full replacement of `src/scene/machine.ts`:

```ts
import { Matrix4, Quaternion, Vector3 } from 'three';
import { FRAME_PARTS, REGIONS } from './brain';
import type { PartMotion } from './motion';
import { domeLayout, DOME_RADIUS, type SeatPlacement } from './domeLayout';
import { buildPart, type PartPieces } from './parts';

/** Each part is built once here; Gear reads its pieces back rather than rebuilding. */
export const partById: Record<string, PartPieces> = {};

const PART_AXIS = new Vector3(0, 0, 1);
const UP = new Vector3(0, 1, 0);

/**
 * The frame is placed by hand rather than by domeLayout: ribs are meridians
 * standing in their own plane, not parts seated on the shell, and they do not
 * explode — the regions separate out of a frame that stays put.
 */
const framePlacements: SeatPlacement[] = FRAME_PARTS.map((part) => {
  partById[part.id] = buildPart(part.name, part.radius, `${part.name}-${part.id}`);
  const spin = new Quaternion().setFromAxisAngle(UP, (part.azimuth * Math.PI) / 180);
  if (part.id === 'base') {
    // The ring lies flat in the XZ plane: its +Z axis points up.
    const flat = new Quaternion().setFromUnitVectors(PART_AXIS, UP);
    return seat(part.id, [0, 0, 0], flat);
  }
  if (part.id === 'crown') {
    const flat = new Quaternion().setFromUnitVectors(PART_AXIS, UP);
    return seat(part.id, [0, DOME_RADIUS * 0.99, 0], flat);
  }
  // A rib is built in the XY plane; turning it about +Y spaces the meridians.
  return seat(part.id, [0, 0, 0], spin, part.radius);
});

function seat(
  id: string,
  at: [number, number, number],
  q: Quaternion,
  radius = DOME_RADIUS,
): SeatPlacement {
  return {
    id,
    region: 'frame',
    assembled: at,
    exploded: at,
    quaternion: [q.x, q.y, q.z, q.w],
    radius,
  };
}

const layout = domeLayout(
  REGIONS.map((region) => ({
    region: region.id,
    azimuth: region.azimuth,
    elevation: region.elevation,
    parts: region.parts.map((part, i) => {
      const id = `${region.id}-${i}`;
      partById[id] = buildPart(part.name, part.radius, `${part.name}-${id}`);
      return { id, radius: part.radius };
    }),
  })),
);

export const placements: SeatPlacement[] = [...framePlacements, ...layout.placements];
export const placementById: Record<string, SeatPlacement> = Object.fromEntries(
  placements.map((p) => [p.id, p]),
);
export const regionCentroids = layout.regionCentroids;

/** What the camera has to frame, closed up and opened out. */
export const brainDiameter = 2 * Math.max(DOME_RADIUS, layout.assembledReach);
export const explodedDiameter = 2 * Math.max(DOME_RADIUS, layout.explodedReach);

/** How each part moves. Frame parts are still. */
export const motionById: Record<string, PartMotion> = {
  ...Object.fromEntries(FRAME_PARTS.map((p) => [p.id, { kind: 'still' } as PartMotion])),
  ...Object.fromEntries(
    REGIONS.flatMap((region) => region.parts.map((part, i) => [`${region.id}-${i}`, part.motion])),
  ),
};

/** Unused import guard: Matrix4 is re-exported nowhere; remove if the linter flags it. */
void Matrix4;
```

> **Note for the implementer:** delete the `void Matrix4;` line and the `Matrix4` import if you do not end up needing it. `noUnusedLocals` is on.

- [ ] **Step 3: Change `Gear.tsx` to read a point**

Three edits in `src/scene/Gear.tsx`:

1. Replace the import:
```ts
import { seatPosition, type SeatPlacement } from './domeLayout';
```
2. Change the prop type `placement: GearPlacement` → `placement: SeatPlacement`, and remove `layer` for now (Task 7 restores labelling). Hover colour becomes the ink accent:
```ts
const activeColor = useMemo(() => new Color(ACCENT), []);
```
Import `ACCENT` from `./theme`.
3. Replace the position write in `useFrame`:
```ts
if (slider.current) {
  seatPosition(placement, explodeAmount(stage.current), seated);
  slider.current.position.copy(seated);
}
```
with `const seated = useMemo(() => new Vector3(), []);` declared alongside the other refs. Delete the `escape`/`scatterById` lines and the `SCATTER_DISTANCE` import — Task 7 reinstates scatter for regions.

Also remove the hover `<Html>` label block for now; Task 7 restores it with region data.

- [ ] **Step 4: Point `MachineScene.tsx` at the new exports**

```ts
import { brainDiameter, explodedDiameter, motionById, placements } from './machine';
```
and in the map, drop the `layer` prop:
```tsx
{placements.map((p) => (
  <Gear key={p.id} placement={p} motion={motionById[p.id]} />
))}
```
Pass framing to `ScrollCamera` as `assembledLength={0} explodedLength={0} diameter={brainDiameter}`. (`explodedDiameter` is wired in Task 8.)

Delete `<Spindle />` and its function — a dome has no centre line.

- [ ] **Step 5: Stub `SkillCallouts.tsx` so the build passes**

Replace its body with `export function SkillCallouts() { return null; }` and delete the now-unused imports. Task 7 rebuilds it.

- [ ] **Step 6: Delete the superseded files**

```bash
git rm src/scene/axisLayout.ts src/scene/axisLayout.test.ts src/scene/assembly.ts
```

Also delete `src/scene/skillParts.ts` and `src/scene/skillParts.test.ts` (Task 7 rewrites them) and fix any remaining import of `assembly.ts` in `src/ui/SkillsPanel.tsx` and `src/ui/sections/Projects.tsx` by temporarily rendering `null` / the unfiltered grid. Those two files are rebuilt in Task 10.

- [ ] **Step 7: Write the brain test**

Create `src/scene/brain.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FRAME_PARTS, REGIONS } from './brain';
import { PART_NAMES } from './parts';

describe('frame', () => {
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
  });

  it('has a base ring and a crown', () => {
    expect(FRAME_PARTS.some((p) => p.name === 'mountingRing')).toBe(true);
    expect(FRAME_PARTS.some((p) => p.name === 'crownPlate')).toBe(true);
  });
});

describe('REGIONS', () => {
  it('is empty until Task 5 populates it', () => {
    expect(REGIONS).toEqual([]);
  });
});
```

- [ ] **Step 8: Verify it builds and renders**

```bash
npx tsc --noEmit -p tsconfig.json
npx vitest run
npx vite build
```
Expected: all clean. Then:
```bash
npx vite preview --port 4190 &
node --experimental-websocket <scratchpad>/shot.mjs http://localhost:4190/ dome-a.png 1440 900 p0.30
node --experimental-websocket <scratchpad>/shot.mjs http://localhost:4190/ dome-b.png 1440 900 p0.50
node --experimental-websocket <scratchpad>/shot.mjs http://localhost:4190/ dome-c.png 1440 900 p0.80
```

- [ ] **Step 9: STOP. Show the three stills and ask.**

Do not proceed to Task 5 until the user confirms the dome reads as a cranium. If it does not, report that and stop — this is the kill switch.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: the bare cranial frame, seated by domeLayout"
```

---

## Task 5: Populate the six regions

**Files:**
- Modify: `src/scene/brain.ts`
- Modify: `src/scene/brain.test.ts`

**Interfaces:**
- Consumes: `BrainRegion`, `RegionPart`, `RegionId` (Task 4).
- Produces: `REGIONS` with six entries; `regionById` keyed by `RegionId`.

- [ ] **Step 1: Write the failing tests**

Replace the `REGIONS` describe block in `src/scene/brain.test.ts`:

```ts
import { projects } from '../lib/data';

describe('REGIONS', () => {
  it('has the six regions, in a stable order', () => {
    expect(REGIONS.map((r) => r.id)).toEqual([
      'logic', 'learning', 'vision', 'motor', 'language', 'memory',
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

  it('never seats a region below the base ring or on the crown', () => {
    for (const r of REGIONS) {
      expect(r.elevation).toBeGreaterThan(5);
      expect(r.elevation).toBeLessThan(80);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/scene/brain.test.ts`
Expected: FAIL — `REGIONS` is empty.

- [ ] **Step 3: Populate `REGIONS`**

Replace `export const REGIONS: BrainRegion[] = [];` with:

```ts
/**
 * The six regions, each pairing a real brain function with a domain the repos
 * demonstrate. No pairing is asserted: every one is checkable against the grid.
 *
 * Archetype choice carries the meaning — meshing trains for Logic, optics for
 * Vision, pistons for Motor, platters for Memory — which is what gives the
 * mechanism a reason to be mechanical.
 */
export const REGIONS: BrainRegion[] = [
  {
    id: 'logic',
    label: 'Logic',
    domain: 'Algorithms & data structures',
    color: '#4fa3ff',
    repos: ['pathfinding', 'pathfinding2', 'caterpiller', 'quicklink'],
    azimuth: 0,
    elevation: 24,
    parts: [
      { name: 'gearCluster', radius: 0.62, motion: { kind: 'spin', turnsPerSecond: -0.05 } },
      { name: 'spurGear', radius: 0.44, motion: { kind: 'spin', turnsPerSecond: 0.3 } },
      { name: 'lobedCam', radius: 0.4, motion: { kind: 'spin', turnsPerSecond: -0.42 } },
      { name: 'spokedWheel', radius: 0.52, motion: { kind: 'tick', steps: 20, ticksPerSecond: 1 } },
    ],
  },
  {
    id: 'learning',
    label: 'Learning',
    domain: 'Machine learning',
    color: '#ffa64d',
    repos: ['NeuralNetwork', 'neural-critters', 'McWicsHackathon', 'pandas-marketingdata-prep'],
    azimuth: 60,
    elevation: 52,
    parts: [
      { name: 'turbineHub', radius: 0.54, motion: { kind: 'spin', turnsPerSecond: 0.46 } },
      { name: 'finnedCollar', radius: 0.46, motion: { kind: 'spin', turnsPerSecond: -0.2 } },
      { name: 'slottedDisc', radius: 0.5, motion: { kind: 'spin', turnsPerSecond: 0.12 } },
    ],
  },
  {
    id: 'vision',
    label: 'Vision',
    domain: 'Graphics & simulation',
    color: '#c58cff',
    repos: ['learn-shaders', 'BridgeOrBust', 'neural-critters'],
    azimuth: 130,
    elevation: 26,
    parts: [
      { name: 'lensGroup', radius: 0.58, motion: { kind: 'tick', steps: 36, ticksPerSecond: 0.8 } },
      { name: 'lensBarrel', radius: 0.48, motion: { kind: 'spin', turnsPerSecond: 0.08 } },
      { name: 'retainingRing', radius: 0.54, motion: { kind: 'still' } },
    ],
  },
  {
    id: 'motor',
    label: 'Motor',
    domain: 'Games & robotics',
    color: '#5fd67a',
    repos: ['BridgeOrBust', 'caterpiller', 'treasurehunt', 'ecse-211-robot', 'GearMeUp'],
    azimuth: 190,
    elevation: 50,
    parts: [
      { name: 'cylinderBank', radius: 0.62, motion: { kind: 'spin', turnsPerSecond: 0.06 } },
      { name: 'castellatedCrown', radius: 0.46, motion: { kind: 'still' } },
      { name: 'bearing', radius: 0.5, motion: { kind: 'spin', turnsPerSecond: 0.14 } },
    ],
  },
  {
    id: 'language',
    label: 'Language',
    domain: 'Interfaces & APIs',
    color: '#3fbfb0',
    repos: ['ECSEGAMES', 'enggames-partners', 'mern-chat-app', 'gen-z-translator', 'GearMeUp', 'fakeCodePolisher'],
    azimuth: 250,
    elevation: 24,
    parts: [
      { name: 'boltedFlange', radius: 0.56, motion: { kind: 'still' } },
      { name: 'hexBoss', radius: 0.34, motion: { kind: 'still' } },
      { name: 'knurledCollar', radius: 0.46, motion: { kind: 'rock', degrees: 14, hz: 0.26 } },
      { name: 'spacerRing', radius: 0.5, motion: { kind: 'spin', turnsPerSecond: -0.07 } },
    ],
  },
  {
    id: 'memory',
    label: 'Memory',
    domain: 'Data & storage',
    color: '#d8453a',
    repos: ['pandas-marketingdata-prep', 'mern-chat-app', 'gen-z-translator', 'ECSEGAMES'],
    azimuth: 310,
    elevation: 50,
    parts: [
      { name: 'slottedDisc', radius: 0.54, motion: { kind: 'spin', turnsPerSecond: 0.1 } },
      { name: 'ringGear', radius: 0.48, motion: { kind: 'spin', turnsPerSecond: 0.16 } },
      { name: 'retainingRing', radius: 0.52, motion: { kind: 'still' } },
    ],
  },
];
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Screenshot and eyeball the populated dome**

```bash
npx vite build && npx vite preview --port 4191 &
node --experimental-websocket <scratchpad>/shot.mjs http://localhost:4191/ regions.png 1440 900 p0.30
```
Check clusters do not interpenetrate the ribs. If they do, lower `INNER` in `domeLayout.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/scene/brain.ts src/scene/brain.test.ts
git commit -m "feat: the six brain regions, grounded in the repos"
```

---

## Task 6: `regionRepos.ts` — resolve a region's repos

**Files:**
- Create: `src/lib/regionRepos.ts`
- Create: `src/lib/regionRepos.test.ts`
- Delete: `src/lib/layerRepos.ts`, `src/lib/layerRepos.test.ts`

**Interfaces:**
- Consumes: `Project` from `src/lib/types.ts`; `REGIONS` from `src/scene/brain.ts`.
- Produces: `reposForRegion(ids: string[], all: Project[]): Project[]`; `regionCounts(regions: {id: string; repos: string[]}[], all: Project[]): Record<string, number>`.

**Context:** `layerRepos.ts` matched technology strings against languages and readme prose. That cannot see a domain — no language field reveals that `treasurehunt` is a game. Regions declare repo ids explicitly instead; this module just resolves them, preserving grid order.

- [ ] **Step 1: Write the failing test**

Create `src/lib/regionRepos.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { REGIONS } from '../scene/brain';
import { projects } from './data';
import { regionCounts, reposForRegion } from './regionRepos';
import type { Project } from './types';

function project(id: string): Project {
  return {
    id, title: id, blurb: null, url: '', homepage: null, language: null, languages: {},
    stars: 0, sizeKb: 0, pushedAt: '2026-01-01T00:00:00Z', topics: [], readme: null,
    featured: false, image: null, activity: 0,
  };
}

const all = [project('a'), project('b'), project('c')];

describe('reposForRegion', () => {
  it('resolves ids to projects', () => {
    expect(reposForRegion(['a', 'c'], all).map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('keeps the grid order, not the order the ids were listed in', () => {
    expect(reposForRegion(['c', 'a'], all).map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('silently skips an id that is not visible', () => {
    expect(reposForRegion(['a', 'ghost'], all).map((p) => p.id)).toEqual(['a']);
  });

  it('returns nothing for no ids', () => {
    expect(reposForRegion([], all)).toEqual([]);
  });
});

describe('regionCounts', () => {
  it('counts per region id', () => {
    expect(regionCounts([{ id: 'x', repos: ['a', 'b'] }, { id: 'y', repos: ['c'] }], all))
      .toEqual({ x: 2, y: 1 });
  });
});

describe('against the real data', () => {
  it('matches at least one visible repo for every region', () => {
    const counts = regionCounts(REGIONS, projects);
    for (const region of REGIONS) {
      expect(counts[region.id], `${region.label} matches no repo`).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/regionRepos.test.ts`
Expected: FAIL — cannot resolve `./regionRepos`.

- [ ] **Step 3: Implement**

Create `src/lib/regionRepos.ts`:

```ts
import type { Project } from './types';

/**
 * The repos a region's work lives in.
 *
 * Regions declare their repo ids by hand rather than matching on languages,
 * because a domain is not visible in the data: no language field reveals that
 * treasurehunt is a game or that pathfinding is an algorithms exercise. The
 * declaration is hand-authored but checkable, and brain.test.ts enforces that
 * every listed id exists and is visible.
 */
export function reposForRegion(ids: string[], all: Project[]): Project[] {
  const wanted = new Set(ids);
  // Filter rather than map, so the grid's own order survives.
  return all.filter((project) => wanted.has(project.id));
}

/** How many visible repos each region lists, keyed by region id. */
export function regionCounts(
  regions: { id: string; repos: string[] }[],
  all: Project[],
): Record<string, number> {
  return Object.fromEntries(regions.map((r) => [r.id, reposForRegion(r.repos, all).length]));
}
```

- [ ] **Step 4: Run the tests, then delete the superseded module**

```bash
npx vitest run src/lib/regionRepos.test.ts
git rm src/lib/layerRepos.ts src/lib/layerRepos.test.ts
```
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: resolve a region's repos by declared id"
```

---

## Task 7: Region labels and scatter

**Files:**
- Create: `src/scene/skillParts.ts` (replaces the deleted one)
- Create: `src/scene/skillParts.test.ts`
- Modify: `src/scene/SkillCallouts.tsx` (full replacement)
- Modify: `src/scene/Gear.tsx` (restore hover label + region colour)

**Interfaces:**
- Consumes: `REGIONS`, `BrainRegion`, `RegionId` (Task 5); `regionCentroids` (Task 4); `seatPosition` (Task 3).
- Produces: `REGION_LABELS: RegionLabel[]`, `planRegionLabels(regions)`, `SCATTER_DISTANCE`, `scatterByRegion: Record<string, [number, number]>`.

**Context:** In the stack, individual parts flew off and carried labels. Here a **region** is the unit: all of a region's parts already separate radially during `explode`, so scatter adds a further outward push for the whole cluster and anchors one label at its centroid.

- [ ] **Step 1: Write the failing test**

Create `src/scene/skillParts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { BrainRegion } from './brain';
import { planRegionLabels } from './skillParts';

const regions = [
  { id: 'logic', label: 'Logic', domain: 'Algorithms', color: '#4fa3ff', repos: ['a'], azimuth: 0, elevation: 24, parts: [] },
  { id: 'vision', label: 'Vision', domain: 'Graphics', color: '#c58cff', repos: ['b'], azimuth: 130, elevation: 26, parts: [] },
  { id: 'memory', label: 'Memory', domain: 'Data', color: '#d8453a', repos: ['c'], azimuth: 310, elevation: 50, parts: [] },
] as unknown as BrainRegion[];

describe('planRegionLabels', () => {
  const plan = planRegionLabels(regions);

  it('labels every region, so nothing on screen is decorative', () => {
    expect(plan.map((p) => p.id)).toEqual(['logic', 'vision', 'memory']);
    expect(plan.map((p) => p.label)).toEqual(['Logic', 'Vision', 'Memory']);
  });

  it('carries the domain and colour through', () => {
    expect(plan.map((p) => p.domain)).toEqual(['Algorithms', 'Graphics', 'Data']);
    expect(plan.map((p) => p.color)).toEqual(['#4fa3ff', '#c58cff', '#d8453a']);
  });

  it('escapes along unit directions', () => {
    for (const p of plan) expect(Math.hypot(...p.direction)).toBeCloseTo(1, 6);
  });

  it('fans the directions evenly around the axis', () => {
    const TAU = Math.PI * 2;
    const angles = plan.map((p) => Math.atan2(p.direction[1], p.direction[0]));
    const gaps = angles.slice(1).map((a, i) => ((a - angles[i]) % TAU + TAU) % TAU);
    for (const gap of gaps) expect(gap).toBeCloseTo(TAU / plan.length, 6);
  });

  it('separates every region from every other', () => {
    for (let i = 0; i < plan.length; i++) {
      for (let j = i + 1; j < plan.length; j++) {
        const [ax, az] = plan[i].direction;
        const [bx, bz] = plan[j].direction;
        expect(Math.hypot(ax - bx, az - bz)).toBeGreaterThan(0.2);
      }
    }
  });

  it('handles an empty brain', () => {
    expect(planRegionLabels([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/scene/skillParts.test.ts`
Expected: FAIL — cannot resolve `./skillParts`.

- [ ] **Step 3: Implement `skillParts.ts`**

```ts
import { REGIONS, type BrainRegion } from './brain';

export interface RegionLabel {
  id: string;
  label: string;
  domain: string;
  color: string;
  /** Unit direction the cluster pushes further out, in the horizontal plane (x, z). */
  direction: [number, number];
}

/**
 * How much further a region's cluster travels once labelled, on top of the
 * radial separation it already has from the explode act.
 */
export const SCATTER_DISTANCE = 1.6;

/** Fans every region outward, each with its own label. */
export function planRegionLabels(regions: BrainRegion[]): RegionLabel[] {
  return regions.map((region, i) => {
    // Half a step of offset so nothing escapes straight up into its own label.
    const angle = ((i + 0.5) / regions.length) * Math.PI * 2;
    return {
      id: region.id,
      label: region.label,
      domain: region.domain,
      color: region.color,
      direction: [Math.cos(angle), Math.sin(angle)] as [number, number],
    };
  });
}

export const REGION_LABELS: RegionLabel[] = planRegionLabels(REGIONS);

export const scatterByRegion: Record<string, [number, number]> = Object.fromEntries(
  REGION_LABELS.map((r) => [r.id, r.direction] as const),
);
```

- [ ] **Step 4: Rebuild `SkillCallouts.tsx`**

Anchor one label per region at its centroid, pushed out along the region's direction. Keep the two-line callout markup and the `APPEAR_AT` / `FULL_AT` fade from the stack design, and keep `LABEL_OUT = 2.3` / `LABEL_UP = 0.5` — the camera is still overhead at scatter, so outward still does the work.

```tsx
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { regionCentroids } from './machine';
import { REGION_LABELS, SCATTER_DISTANCE, type RegionLabel } from './skillParts';
import { actProgress, explodeAmount, stage } from './timeline';
import { EXPLODE_GAP } from './domeLayout';

const APPEAR_AT = 0.25;
const FULL_AT = 0.5;
const LABEL_OUT = 2.3;
const LABEL_UP = 0.5;

function CalloutMarker({ region }: { region: RegionLabel }) {
  const group = useRef<Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const seat = regionCentroids[region.id] ?? [0, 0, 0];

  useFrame(() => {
    const scatter = actProgress(stage.current, 'scatter');
    const open = explodeAmount(stage.current);
    if (group.current) {
      // Follows its cluster: outward with the explode, then further on scatter.
      const out = 1 + (EXPLODE_GAP * open) / Math.max(1e-6, Math.hypot(...seat));
      group.current.position.set(
        seat[0] * out + region.direction[0] * scatter * SCATTER_DISTANCE,
        seat[1] * out,
        seat[2] * out + region.direction[1] * scatter * SCATTER_DISTANCE,
      );
    }
    if (label.current) {
      const t = (scatter - APPEAR_AT) / (FULL_AT - APPEAR_AT);
      label.current.style.opacity = String(Math.min(1, Math.max(0, t)));
    }
  });

  return (
    <group ref={group}>
      <Html
        position={[region.direction[0] * LABEL_OUT, LABEL_UP, region.direction[1] * LABEL_OUT]}
        center
        zIndexRange={[6, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div ref={label} className="callout" style={{ opacity: 0 }}>
          <span className="callout__stem" style={{ background: region.color }} />
          <span className="callout__text">
            <span className="callout__name">
              <span className="callout__dot" style={{ background: region.color }} />
              {region.label}
            </span>
            <span className="callout__share">{region.domain}</span>
          </span>
        </div>
      </Html>
    </group>
  );
}

/** Names each region of the brain, on the cluster that carries it. */
export function SkillCallouts() {
  return (
    <>
      {REGION_LABELS.map((region) => (
        <CalloutMarker key={region.id} region={region} />
      ))}
    </>
  );
}
```

- [ ] **Step 5: Restore hover and scatter in `Gear.tsx`**

Add a `region` prop (`BrainRegion | undefined` — frame parts have none). Use it for the hover colour and the hover label; add the scatter push to the position write:

```ts
const scatter = region ? scatterByRegion[region.id] : undefined;
// ...inside useFrame:
seatPosition(placement, explodeAmount(stage.current), seated);
if (scatter) {
  const away = actProgress(stage.current, 'scatter') * SCATTER_DISTANCE;
  seated.x += scatter[0] * away;
  seated.z += scatter[1] * away;
}
slider.current.position.copy(seated);
```

Hover colour: `new Color(region?.color ?? ACCENT)`. Hover label: `region.label` above, `region.domain` below. Selecting sets `selected` to the **region id**, not the part id, so a whole cluster highlights:

```ts
const onClick = (e: ThreeEvent<MouseEvent>) => {
  e.stopPropagation();
  if (!region) return;
  setSelected(selected === region.id ? null : region.id);
};
```
and `const selected = useStore((s) => s.selected) === region?.id;`

`MachineScene.tsx` passes `region={regionById[p.region]}`.

- [ ] **Step 6: Run everything and screenshot**

```bash
npx tsc --noEmit -p tsconfig.json && npx vitest run && npx vite build
```
Then capture at `p0.82` and check every label clears its cluster.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: region labels anchored to cluster centroids"
```

---

## Task 8: Re-time the acts and the camera

**Files:**
- Modify: `src/scene/timeline.ts`
- Modify: `src/scene/timeline.test.ts`
- Modify: `src/scene/cameraPath.ts`
- Modify: `src/scene/cameraPath.test.ts`
- Modify: `src/scene/ScrollCamera.tsx`
- Modify: `src/scene/MachineScene.tsx`

**Interfaces:**
- Consumes: `brainDiameter`, `explodedDiameter` (Task 4).
- Produces: `FramingOptions` gains optional `explodedDiameter`.

**Context (spec §6):** the stack lay flat as an unreadable row, so it separated first and stood up after. An intact cranium is the striking thing, so it must be seen whole and **turned before it comes apart**.

- [ ] **Step 1: Re-time `ACTS`**

In `src/scene/timeline.ts`:

```ts
export const ACTS = {
  /** Oversized type holds, then clears the stage. */
  typeOut: [0.03, 0.14],
  /** The cranium fades up, intact and dormant. */
  machineIn: [0.09, 0.22],
  /**
   * The reveal rotation. Named `upright` for continuity with the stack design,
   * which stood a column up here; for the brain it simply turns the intact
   * assembly. Renaming would touch six files and buy nothing.
   */
  upright: [0.22, 0.42],
  /** Regions separate radially out of the frame, which stays put. */
  explode: [0.42, 0.64],
  /** Labels arrive as the camera finishes rising to look into the assembly. */
  scatter: [0.66, 0.9],
  /** It clears out, handing over to the about text. */
  machineOut: [0.92, 1],
} as const;
```

Set `const RECOMPACT = 0;` with a comment: pulling radially fanned regions back toward the centre before labelling them would undo the separation the labels point at.

- [ ] **Step 2: Move the camera keys to match**

```ts
export const CAMERA_PATH: CameraKey[] = [
  { at: 0, azimuth: -20, elevation: 8, distance: 1 },
  { at: 0.22, azimuth: -14, elevation: 8, distance: 1 },
  // Held identical through the reveal rotation: the brain turns, the camera does not.
  { at: 0.42, azimuth: -14, elevation: 8, distance: 1 },
  { at: 0.66, azimuth: 2, elevation: 58, distance: 1 },
  { at: 1, azimuth: 42, elevation: 64, distance: 1 },
];
```

- [ ] **Step 3: Add `explodedDiameter` to the framing**

In `FramingOptions`:
```ts
  /** Widest extent across, closed up. */
  diameter: number;
  /** Widest extent across once open. Defaults to `diameter` for a subject that
   *  grows along its axis rather than radially. */
  explodedDiameter?: number;
```
In `cameraStateFor`, after destructuring:
```ts
const grown = diameter + ((options.explodedDiameter ?? diameter) - diameter) * axialProgress;
```
and use `grown` everywhere `diameter` was passed to `framingDistance`, including in `spread`.

- [ ] **Step 4: Write the tests**

Add to `src/scene/cameraPath.test.ts`:

```ts
describe('a subject that grows radially', () => {
  const base = { assembledLength: 0, explodedLength: 0, scatterDistance: 1.6, fov: 22, aspect: 16 / 9, margin: 1.14 };

  it('pulls back as the diameter grows', () => {
    const closed = cameraStateFor(0.3, 0, 0, { ...base, diameter: 6, explodedDiameter: 12 });
    const open = cameraStateFor(0.3, 0, 1, { ...base, diameter: 6, explodedDiameter: 12 });
    expect(open.distance).toBeGreaterThan(closed.distance);
  });

  it('frames the intact subject as tightly as a fixed diameter would', () => {
    const grown = cameraStateFor(0.3, 0, 0, { ...base, diameter: 6, explodedDiameter: 12 });
    const fixed = cameraStateFor(0.3, 0, 0, { ...base, diameter: 6 });
    expect(grown.distance).toBeCloseTo(fixed.distance, 6);
  });

  it('defaults to the closed diameter when no growth is declared', () => {
    const a = cameraStateFor(0.5, 0, 1, { ...base, diameter: 6 });
    const b = cameraStateFor(0.5, 0, 0, { ...base, diameter: 6 });
    expect(a.distance).toBeCloseTo(b.distance, 6);
  });
});
```

Add to `src/scene/timeline.test.ts`:

```ts
it('turns the brain before it comes apart', () => {
  expect(ACTS.upright[1]).toBeLessThanOrEqual(ACTS.explode[0]);
});

it('does not recompact, because the regions fan radially', () => {
  expect(explodeAmount(0.8)).toBeGreaterThanOrEqual(explodeAmount(0.64) - 1e-9);
});
```

Keep the existing camera-monotonicity test — it must still pass with the moved keys.

- [ ] **Step 5: Wire `explodedDiameter` through**

`MachineScene.tsx` passes `explodedDiameter={explodedDiameter}` to `ScrollCamera`; `ScrollCamera.tsx` adds it to its props and forwards it in the options object.

- [ ] **Step 6: Run everything**

Run: `npx tsc --noEmit -p tsconfig.json && npx vitest run && npx vite build`
Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: turn the brain before it opens; frame a subject that grows radially"
```

---

## Task 9: Coming alive

**Files:**
- Modify: `src/lib/store.ts`
- Create: `src/lib/store.test.ts`
- Modify: `src/scene/Gear.tsx`

**Interfaces:**
- Consumes: `RegionId` (Task 4).
- Produces: `touched: string[]`, `touch(id: string)`, `wakingLevel(touched: string[], total: number): number`.

**Context (spec §7):** the brain starts nearly dormant and quickens as regions are touched, region by region. `Gear.tsx` already multiplies its clock by a rate; this feeds that.

- [ ] **Step 1: Write the failing test**

Create `src/lib/store.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { wakingLevel } from './store';

describe('wakingLevel', () => {
  it('starts dormant but never frozen', () => {
    expect(wakingLevel([], 6)).toBeCloseTo(0.15, 6);
  });

  it('rises with each region touched', () => {
    const levels = [0, 1, 2, 3].map((n) => wakingLevel(['a', 'b', 'c'].slice(0, n), 6));
    for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeGreaterThan(levels[i - 1]);
  });

  it('reaches full speed when every region has been touched, and clamps', () => {
    expect(wakingLevel(['a', 'b', 'c', 'd', 'e', 'f'], 6)).toBeCloseTo(1, 6);
    expect(wakingLevel(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 6)).toBeCloseTo(1, 6);
  });

  it('is full when there is nothing to touch', () => {
    expect(wakingLevel([], 0)).toBeCloseTo(1, 6);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/store.test.ts`
Expected: FAIL — `wakingLevel` is not exported.

- [ ] **Step 3: Implement**

In `src/lib/store.ts`, add to the interface and the creator:

```ts
/** Regions the viewer has hovered or selected. */
touched: string[];
touch(id: string): void;
```
```ts
touched: [],
touch: (id) =>
  set((s) => (s.touched.includes(id) ? s : { touched: [...s.touched, id] })),
```

> Build a **new** array rather than pushing, or zustand will not notify.

And export the pure function:

```ts
/** How awake the mechanism is: dormant until touched, full once every region has been. */
const DORMANT_RATE = 0.15;

export function wakingLevel(touched: string[], total: number): number {
  if (total <= 0) return 1;
  const share = Math.min(1, touched.length / total);
  return DORMANT_RATE + (1 - DORMANT_RATE) * share;
}
```

- [ ] **Step 4: Feed it into `Gear.tsx`**

```ts
const touched = useStore((s) => s.touched);
const awake = wakingLevel(touched, REGIONS.length);
const mine = region ? touched.includes(region.id) : false;
// ...in useFrame:
const base = reduced ? REDUCED_RATE : mine ? 1 : awake;
const rate = reduced ? REDUCED_RATE : hovered ? HOVER_RATE : selected ? SELECT_RATE : base;
```

Call `touch(region.id)` in `onOver` and `onClick`, guarded on `region` being present.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.json`
Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: the brain wakes region by region as you touch it"
```

---

## Task 10: The read-out and the project filter

**Files:**
- Modify: `src/ui/SkillsPanel.tsx` (full replacement)
- Modify: `src/ui/sections/Projects.tsx`

**Interfaces:**
- Consumes: `REGIONS`, `regionById` (Task 5); `regionCounts`, `reposForRegion` (Task 6); `selected` from the store.
- Produces: no new exports.

- [ ] **Step 1: Rewrite `SkillsPanel.tsx`**

```tsx
import { projects } from '../lib/data';
import { regionCounts } from '../lib/regionRepos';
import { REGIONS } from '../scene/brain';

const counts = regionCounts(REGIONS, projects);

/**
 * The brain's read-out: what each region is, and how many repos are built on it.
 * The count is the honest number — repos the region actually declares — rather
 * than a share of bytes, which flatters whichever language checks in the
 * largest files.
 */
export function SkillsPanel() {
  if (REGIONS.length === 0) return null;

  return (
    <div className="readout">
      <p className="readout__head">
        <span>The brain</span>
        <span className="readout__total">{REGIONS.length} regions</span>
      </p>
      <ul className="readout__keys readout__keys--rows">
        {REGIONS.map((region) => (
          <li key={region.id}>
            <span className="readout__dot" style={{ background: region.color }} aria-hidden="true" />
            {region.label}
            <span className="readout__tech">{region.domain}</span>
            <span className="readout__share">{counts[region.id]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Repoint the filter in `Projects.tsx`**

Change the three imports and the two derived lines; everything else stays:

```tsx
import { reposForRegion } from '../../lib/regionRepos';
import { regionById } from '../../scene/brain';
// ...
const region = selected ? regionById[selected] : undefined;
const shown = region ? reposForRegion(region.repos, projects) : projects;
```
and in the chip, `region.label` / `region.color` replace `layer.label` / `layer.color`.

- [ ] **Step 3: Verify the filter end to end**

```bash
npx vite build && npx vite preview --port 4192 &
node --experimental-websocket <scratchpad>/filter.mjs http://localhost:4192/ 1 2 3
```
Expected: Tab selects successive regions; each filters the grid; the counts match the read-out.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: read-out lists the regions; clicking one filters the grid"
```

---

## Task 11: Wiring from each region to the frame

**Files:**
- Modify: `src/scene/MachineScene.tsx`

**Interfaces:**
- Consumes: `regionCentroids` (Task 4), `REGIONS` (Task 5), `DOME_RADIUS` (Task 3).
- Produces: nothing exported.

**Context (spec §5.3):** thin lines tie each region to the mounting ring so the exploded view still reads as one assembly rather than loose parts.

- [ ] **Step 1: Add a `Wiring` component**

In `src/scene/MachineScene.tsx`, replacing the deleted `Spindle`:

```tsx
/** Thin runs from each region down to the mounting ring, so the exploded view
 *  still reads as one assembly rather than loose parts. */
function Wiring() {
  return (
    <>
      {REGIONS.map((region) => {
        const seat = regionCentroids[region.id];
        if (!seat) return null;
        const foot: [number, number, number] = [
          seat[0] * (DOME_RADIUS / Math.max(1e-6, Math.hypot(seat[0], seat[2]))),
          0,
          seat[2] * (DOME_RADIUS / Math.max(1e-6, Math.hypot(seat[0], seat[2]))),
        ];
        return (
          <Line
            key={region.id}
            points={[seat, foot]}
            color={INK_DIM}
            lineWidth={1}
            transparent
            opacity={0.45}
            toneMapped={false}
          />
        );
      })}
    </>
  );
}
```

Render `<Wiring />` inside `<MachineRoot>` before the parts.

- [ ] **Step 2: Verify and screenshot**

```bash
npx tsc --noEmit -p tsconfig.json && npx vite build && npx vite preview --port 4193 &
node --experimental-websocket <scratchpad>/shot.mjs http://localhost:4193/ wiring.png 1440 900 p0.30
```
Check the runs read as wiring, not as clutter. If they do clutter, drop `opacity` to 0.3.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: wiring runs from each region to the mounting ring"
```

---

## Task 12: Update the guide

**Files:**
- Modify: `docs/the-machine.md`

- [ ] **Step 1: Rewrite the affected sections**

The guide currently describes the layered stack. Update:

- Title and intro: the subject is a cranial assembly; keep the short history of why the gears and then the stack were replaced.
- §1 file map: `domeLayout.ts` and `brain.ts` in, `axisLayout.ts` / `assembly.ts` / `layerRepos.ts` out, `regionRepos.ts` in. Refresh line counts with `wc -l`.
- §2 mount sequence: `machine.ts` builds the frame and the regions, calls `domeLayout`.
- §4 coordinate frames: add that the dome's crown is +Y and a part's spin axis points along its seat normal.
- §6 geometry: the 18 archetypes return; add the three frame builders and `PLATE` is gone.
- §7 the design: `brain.ts` and its six regions; the `repos` field is load-bearing.
- §8: replace "Positions — axisLayout" with "Seats — domeLayout", covering radial explode.
- §10 motion: `spin` and `tick` are used again.
- §13 labels: one label per region at its centroid.
- §15 data: the declared-id rule and why tech matching could not see a domain.
- §17 cookbook: rows for moving a region (`azimuth`/`elevation`), changing its parts, changing its repos.
- Add a short section on the waking level.

- [ ] **Step 2: Fact-check every number**

Verify archetype count, test count (`npx vitest run`), and all quoted constants against the source. Do not quote a number you have not just read.

- [ ] **Step 3: Commit**

```bash
git add docs/the-machine.md
git commit -m "docs: the guide describes the cranial assembly"
```

---

## Self-Review

**1. Spec coverage**

| Spec section | Task |
|---|---|
| §2 cranial assembly form | 2, 4 |
| §3 six regions, taxonomy, hidden repos excluded | 5 (+ test in 5 Step 1) |
| §4.1 scalar → point | 3, 4 |
| §4.2 what survives | 4, 8 (corrected: `cameraPath.ts` changes) |
| §4.3 file structure | all |
| §4.4 archetypes restored verbatim | 1 |
| §5.1 frame builders | 2 |
| §5.2 regions use archetypes by meaning | 5 |
| §5.3 wiring | 11 |
| §6 re-timed acts, camera keys, RECOMPACT | 8 |
| §7 coming alive | 9 |
| §8 interaction and filtering | 7 (select by region), 10 (grid filter) |
| §9 testing | each task's test step |
| §10 kill switch | 4 Step 9 |
| §12 definition of done | 4, 10, 12 |

No gaps.

**2. Placeholder scan** — no TBD/TODO. Every code step carries real code. The one judgement call left open is deliberate and bounded: Task 5 Step 5 and Task 11 Step 2 say what to adjust (`INNER`, `opacity`) if the eyeball check fails.

**3. Type consistency** — `SeatPlacement` is defined once in Task 3 and consumed unchanged by Tasks 4 and 7. `RegionId`/`BrainRegion`/`RegionPart` are defined once in Task 4 and consumed by 5, 6, 7, 9, 10. `seatPosition` keeps the same signature throughout. `reposForRegion(ids, all)` and `regionCounts(regions, all)` match between Tasks 6 and 10. `wakingLevel(touched, total)` matches between Task 9 Steps 3 and 4. `scatterByRegion` is produced in Task 7 Step 3 and consumed in Step 5 of the same task.

**One deliberate inconsistency:** `domeLayout.ts` types `region` as `string`, not `RegionId`, so that it does not import from `brain.ts` — `brain.ts` imports `PartName` from `parts`, and `machine.ts` imports both; typing it as `RegionId` would make `domeLayout` depend on `brain`, which is the wrong direction for a pure maths module. Noted in Task 3's Interfaces block.
