import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  Path,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createGearGeometry, gearOutline, teethFor } from '../gearGeometry';
import type { MoverMotion } from '../motion';

/** A sub-assembly that moves independently of the part carrying it. */
export interface Mover {
  /** Centred on its own origin, so it can turn about itself. */
  geometry: BufferGeometry;
  /** Where it sits within the part. */
  offset: [number, number, number];
  motion: MoverMotion;
}

export interface PartPieces {
  /** The part's own structure, which moves with the part. */
  body: BufferGeometry;
  movers: Mover[];
}

/**
 * Builders return a geometry centred on the origin whose spin axis is +Z, or a
 * body plus movers when the part has pieces of its own that move.
 */
export type PartBuilder = (radius: number, rand: () => number) => BufferGeometry | PartPieces;

const Y_TO_Z = new Matrix4().makeRotationX(Math.PI / 2);

/**
 * Radial facets must stay below Gear's EdgesGeometry threshold (EDGE_THRESHOLD_DEG),
 * otherwise every seam of a revolved surface is drawn and the part reads as netting
 * instead of a machined solid. 36 segments → 10° facets.
 */
const RADIAL_SEGMENTS = 36;

/** Three's lathes, cylinders and tori are built around +Y; the scene spins around +Z. */
function toZAxis<T extends BufferGeometry>(geometry: T): T {
  geometry.applyMatrix4(Y_TO_Z);
  return geometry;
}

/** ExtrudeGeometry is non-indexed while the primitives are indexed, so level them before merging. */
function merge(parts: BufferGeometry[]): BufferGeometry {
  const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(flat, false) ?? flat[0];
  // Sub-forms are positioned relative to each other, not to the origin.
  merged.computeBoundingBox();
  const box = merged.boundingBox!;
  merged.translate(
    -(box.min.x + box.max.x) / 2,
    -(box.min.y + box.max.y) / 2,
    -(box.min.z + box.max.z) / 2,
  );
  return merged;
}

function lathe(profile: [number, number][], segments: number): BufferGeometry {
  return toZAxis(new LatheGeometry(profile.map(([x, y]) => new Vector2(x, y)), segments));
}

/** Copies of `geometry` evenly spaced around the axis, each already oriented by `place`. */
function ring(count: number, geometry: BufferGeometry, place: (angle: number) => Matrix4): BufferGeometry[] {
  const out: BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    out.push(geometry.clone().applyMatrix4(place((i / count) * Math.PI * 2)));
  }
  return out;
}

function atAngle(angle: number, distance: number, tilt = 0): Matrix4 {
  return new Matrix4()
    .makeTranslation(Math.cos(angle) * distance, Math.sin(angle) * distance, 0)
    .multiply(new Matrix4().makeRotationZ(angle + tilt));
}

/** Normalises a builder's result: a bare geometry is a body with no movers. */
export function toPieces(result: BufferGeometry | PartPieces): PartPieces {
  return 'body' in result ? result : { body: result, movers: [] };
}

const between = (rand: () => number, lo: number, hi: number) => lo + rand() * (hi - lo);
const countBetween = (rand: () => number, lo: number, hi: number) => Math.round(between(rand, lo, hi));

/** Flat spur gear — the original part, kept as one of the archetypes. */
export const spurGear: PartBuilder = (radius) => createGearGeometry(radius, teethFor(radius));

/** Annulus with teeth cut into its inner face. */
export const ringGear: PartBuilder = (radius, rand) => {
  const thickness = radius * between(rand, 0.18, 0.28);
  const shape = new Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  shape.holes.push(new Path(gearOutline(radius * 0.72, teethFor(radius))));
  const body = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 6 });
  body.translate(0, 0, -thickness / 2);
  return body;
};

/** Barrel with a waisted middle and knurling ridges around the rim. */
export const knurledCollar: PartBuilder = (radius, rand) => {
  const half = radius * between(rand, 0.18, 0.28);
  const waist = radius * 0.9;
  const body = lathe(
    [
      [0, -half],
      [radius, -half],
      [radius, -half * 0.55],
      [waist, -half * 0.3],
      [waist, half * 0.3],
      [radius, half * 0.55],
      [radius, half],
      [0, half],
    ],
    RADIAL_SEGMENTS,
  );
  const ridges = countBetween(rand, 22, 34);
  const ridge = new BoxGeometry(radius * 0.06, radius * 0.1, half * 1.1);
  return merge([body, ...ring(ridges, ridge, (a) => atAngle(a, radius))]);
};

/** Stacked lens-barrel steps of decreasing radius. */
export const lensBarrel: PartBuilder = (radius, rand) => {
  // Few, decisive steps: many shallow ones revolve into something that reads as a spiral.
  const steps = countBetween(rand, 2, 3);
  const depth = radius * between(rand, 0.3, 0.45);
  const profile: [number, number][] = [[0, -depth / 2]];
  for (let i = 0; i < steps; i++) {
    const r = radius * (1 - (i / steps) * between(rand, 0.22, 0.34));
    const y0 = -depth / 2 + (i / steps) * depth;
    const y1 = -depth / 2 + ((i + 1) / steps) * depth;
    profile.push([r, y0], [r, y1]);
  }
  const last = profile[profile.length - 1];
  profile.push([last[0] * 0.55, last[1]], [0, last[1]]);
  return lathe(profile, RADIAL_SEGMENTS);
};

/** Outer race, inner race and a ring of balls between them. */
export const bearing: PartBuilder = (radius, rand) => {
  const half = radius * between(rand, 0.12, 0.18);
  const race = (outer: number, inner: number) =>
    lathe(
      [
        [inner, -half],
        [outer, -half],
        [outer, half],
        [inner, half],
        [inner, -half],
      ],
      RADIAL_SEGMENTS,
    );
  const balls = countBetween(rand, 8, 14);
  const ball = new SphereGeometry(radius * 0.13, 10, 8);
  return merge([
    race(radius, radius * 0.82),
    race(radius * 0.52, radius * 0.34),
    ...ring(balls, ball, (a) => atAngle(a, radius * 0.67)),
  ]);
};

/** Mounting plate with a central bore and a circle of bolts. */
export const boltedFlange: PartBuilder = (radius, rand) => {
  const half = radius * between(rand, 0.08, 0.14);
  const plate = lathe(
    [
      [radius * 0.22, -half],
      [radius, -half],
      [radius, half],
      [radius * 0.22, half],
      [radius * 0.22, -half],
    ],
    RADIAL_SEGMENTS,
  );
  const bolts = countBetween(rand, 5, 9);
  const bolt = toZAxis(new CylinderGeometry(radius * 0.09, radius * 0.09, half * 3, 8));
  return merge([plate, ...ring(bolts, bolt, (a) => atAngle(a, radius * 0.75))]);
};

/** Hub with angled blades — the turbine end of the assembly. */
export const turbineHub: PartBuilder = (radius, rand) => {
  const depth = radius * between(rand, 0.24, 0.34);
  const hub = toZAxis(new CylinderGeometry(radius * 0.34, radius * 0.4, depth, RADIAL_SEGMENTS));
  const blades = countBetween(rand, 9, 15);
  const blade = new BoxGeometry(radius * 0.62, radius * 0.08, depth * 0.95);
  return merge([hub, ...ring(blades, blade, (a) => atAngle(a, radius * 0.66, Math.PI / 7))]);
};

/** Thin spacer washer. TorusGeometry already lies in the XY plane, so no reorienting. */
export const spacerRing: PartBuilder = (radius, rand) =>
  new TorusGeometry(radius * 0.88, radius * between(rand, 0.06, 0.1), 10, RADIAL_SEGMENTS);


/** Toothed rim carried on spokes, with a bossed hub. */
export const spokedWheel: PartBuilder = (radius, rand) => {
  const half = radius * between(rand, 0.09, 0.14);
  const rimInner = radius * 0.76;
  const rim = lathe(
    [
      [rimInner, -half],
      [radius, -half],
      [radius, half],
      [rimInner, half],
      [rimInner, -half],
    ],
    RADIAL_SEGMENTS,
  );
  const teeth = countBetween(rand, 16, 26);
  const tooth = new BoxGeometry(radius * 0.13, radius * 0.11, half * 1.9);
  const spokeCount = countBetween(rand, 3, 5);
  const spoke = new BoxGeometry(rimInner * 0.9, radius * 0.09, half * 1.3);
  const hub = toZAxis(new CylinderGeometry(radius * 0.2, radius * 0.24, half * 3, 12));
  return merge([
    rim,
    hub,
    ...ring(teeth, tooth, (a) => atAngle(a, radius * 1.02)),
    ...ring(spokeCount, spoke, (a) => atAngle(a, rimInner * 0.5)),
  ]);
};

/** Ring topped with square castellations, like a crown coupling. */
export const castellatedCrown: PartBuilder = (radius, rand) => {
  const half = radius * between(rand, 0.1, 0.16);
  const body = lathe(
    [
      [radius * 0.62, -half],
      [radius, -half],
      [radius, half],
      [radius * 0.62, half],
      [radius * 0.62, -half],
    ],
    RADIAL_SEGMENTS,
  );
  const teeth = countBetween(rand, 10, 16);
  const merlon = new BoxGeometry(radius * 0.34, radius * 0.16, half * 1.4);
  const movers: Mover[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    movers.push({
      geometry: merlon.clone().applyMatrix4(new Matrix4().makeRotationZ(a)),
      offset: [Math.cos(a) * radius * 0.81, Math.sin(a) * radius * 0.81, 0],
      // A travelling wave around the ring rather than all of them together.
      motion: { kind: 'reciprocate', travel: half * 0.9, hz: 0.4, phase: i / teeth },
    });
  }
  return { body, movers };
};

/** Radial engine: a case carrying pistons that reciprocate along the axis. */
export const cylinderBank: PartBuilder = (radius, rand) => {
  const depth = radius * between(rand, 0.34, 0.46);
  const cases = countBetween(rand, 5, 8);
  const boss = toZAxis(new CylinderGeometry(radius * 0.34, radius * 0.42, depth * 1.1, 18));
  const plate = lathe(
    [
      [0, -depth * 0.55],
      [radius * 0.5, -depth * 0.55],
      [radius * 0.5, -depth * 0.3],
      [0, -depth * 0.3],
    ],
    RADIAL_SEGMENTS,
  );
  const sleeve = toZAxis(new CylinderGeometry(radius * 0.3, radius * 0.3, depth * 1.15, 14));
  const piston = toZAxis(new CylinderGeometry(radius * 0.24, radius * 0.24, depth * 0.6, 14));
  const crown = toZAxis(new CylinderGeometry(radius * 0.26, radius * 0.26, depth * 0.14, 14));
  crown.translate(0, 0, depth * 0.34);
  const slug = merge([piston, crown]);
  const movers: Mover[] = [];
  const sleeves: BufferGeometry[] = [];
  for (let i = 0; i < cases; i++) {
    const a = (i / cases) * Math.PI * 2;
    const offset: [number, number, number] = [Math.cos(a) * radius * 0.66, Math.sin(a) * radius * 0.66, 0];
    sleeves.push(sleeve.clone().translate(offset[0], offset[1], 0));
    movers.push({
      geometry: slug.clone(),
      offset,
      // Opposed pairs: each piston sits half a beat from the one across the case.
      motion: { kind: 'reciprocate', travel: depth * 0.3, hz: 0.55, phase: i / cases },
    });
  }
  return { body: merge([boss, plate, ...sleeves]), movers };
};

/** Hub wearing a ring of radial cooling fins. */
export const finnedCollar: PartBuilder = (radius, rand) => {
  const depth = radius * between(rand, 0.26, 0.38);
  const hub = toZAxis(new CylinderGeometry(radius * 0.46, radius * 0.46, depth, RADIAL_SEGMENTS));
  const bore = lathe(
    [
      [radius * 0.2, -depth / 2],
      [radius * 0.46, -depth / 2],
      [radius * 0.46, depth / 2],
      [radius * 0.2, depth / 2],
      [radius * 0.2, -depth / 2],
    ],
    RADIAL_SEGMENTS,
  );
  const fins = countBetween(rand, 12, 20);
  const fin = new BoxGeometry(radius * 0.56, radius * 0.045, depth * 0.86);
  return merge([hub, bore, ...ring(fins, fin, (a) => atAngle(a, radius * 0.72))]);
};

/** Hex nut on a stepped collar. */
export const hexBoss: PartBuilder = (radius, rand) => {
  const depth = radius * between(rand, 0.4, 0.56);
  const hex = toZAxis(new CylinderGeometry(radius, radius, depth, 6));
  const collar = toZAxis(new CylinderGeometry(radius * 0.72, radius * 0.72, depth * 1.5, 20));
  const washer = lathe(
    [
      [radius * 0.3, depth * 0.5],
      [radius * 0.86, depth * 0.5],
      [radius * 0.86, depth * 0.66],
      [radius * 0.3, depth * 0.66],
      [radius * 0.3, depth * 0.5],
    ],
    RADIAL_SEGMENTS,
  );
  return merge([hex, collar, washer]);
};

/** Disc with a lobed outline — a cam plate. */
export const lobedCam: PartBuilder = (radius, rand) => {
  const lobes = countBetween(rand, 6, 10);
  const depth = radius * between(rand, 0.1, 0.16);
  const points: Vector2[] = [];
  const steps = lobes * 12;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = radius * (0.88 + 0.12 * Math.cos(a * lobes));
    points.push(new Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const shape = new Shape(points);
  const bore = new Path();
  bore.absarc(0, 0, radius * 0.24, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  const body = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 });
  body.translate(0, 0, -depth / 2);
  const hub = toZAxis(new CylinderGeometry(radius * 0.36, radius * 0.36, depth * 1.8, 18));
  return merge([body, hub]);
};

/** Plate lightened by a ring of slots. */
export const slottedDisc: PartBuilder = (radius, rand) => {
  const depth = radius * between(rand, 0.07, 0.12);
  const shape = new Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  const slots = countBetween(rand, 5, 8);
  for (let i = 0; i < slots; i++) {
    const a = (i / slots) * Math.PI * 2;
    const slot = new Path();
    slot.absarc(Math.cos(a) * radius * 0.6, Math.sin(a) * radius * 0.6, radius * 0.19, 0, Math.PI * 2, true);
    shape.holes.push(slot);
  }
  const bore = new Path();
  bore.absarc(0, 0, radius * 0.22, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  const body = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
  body.translate(0, 0, -depth / 2);
  const hub = toZAxis(new CylinderGeometry(radius * 0.32, radius * 0.32, depth * 2.6, 18));
  return merge([body, hub]);
};

/** Thin flat annulus that closes a stack. */
export const retainingRing: PartBuilder = (radius, rand) => {
  const half = radius * between(rand, 0.035, 0.06);
  return lathe(
    [
      [radius * 0.78, -half],
      [radius, -half],
      [radius, half],
      [radius * 0.78, half],
      [radius * 0.78, -half],
    ],
    RADIAL_SEGMENTS,
  );
};

/** Knurled barrel holding a domed element behind a retaining lip. */
export const lensGroup: PartBuilder = (radius, rand) => {
  const half = radius * between(rand, 0.22, 0.32);
  const barrel = lathe(
    [
      [radius * 0.5, -half],
      [radius, -half],
      [radius, half],
      [radius * 0.86, half],
      [radius * 0.86, half * 0.55],
      [radius * 0.5, half * 0.55],
      [radius * 0.5, -half],
    ],
    RADIAL_SEGMENTS,
  );
  const grips = countBetween(rand, 30, 44);
  const grip = new BoxGeometry(radius * 0.05, radius * 0.08, half * 1.7);
  const dome = new SphereGeometry(radius * 0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3);
  toZAxis(dome);
  dome.translate(0, 0, -half * 0.5);
  return merge([barrel, dome, ...ring(grips, grip, (a) => atAngle(a, radius))]);
};

/** A carrier holding several small gears that mesh side by side on one plane. */
export const gearCluster: PartBuilder = (radius, rand) => {
  const satellites = countBetween(rand, 4, 6);
  const orbit = radius * 0.6;
  // Sized so neighbouring satellites very nearly touch, as a meshing train would.
  const satelliteRadius = Math.min(radius * 0.42, orbit * Math.sin(Math.PI / satellites) * 0.96);
  const half = radius * 0.07;
  const carrier = lathe(
    [
      [radius * 0.14, -half],
      [radius, -half],
      [radius, half],
      [radius * 0.14, half],
      [radius * 0.14, -half],
    ],
    RADIAL_SEGMENTS,
  );
  const spindle = toZAxis(new CylinderGeometry(radius * 0.2, radius * 0.2, half * 4, 14));
  const movers: Mover[] = [];
  for (let i = 0; i < satellites; i++) {
    const a = (i / satellites) * Math.PI * 2;
    movers.push({
      geometry: createGearGeometry(satelliteRadius, teethFor(satelliteRadius), half * 2.4),
      offset: [Math.cos(a) * orbit, Math.sin(a) * orbit, 0],
      // Meshing neighbours must turn opposite ways.
      motion: { kind: 'spin', turnsPerSecond: i % 2 === 0 ? 0.22 : -0.22 },
    });
  }
  return { body: merge([carrier, spindle]), movers };
};

/**
 * One meridian rib of the cranium, swept base → crown → base.
 *
 * Built in the XY plane so the arc stands up, which is what makes the dome read
 * as a cranium rather than a bowl. A rib is a *full* meridian — half a circle —
 * so eight ribs spaced over 180° of azimuth close the whole dome.
 *
 * `radius` is the dome's radius, not the rib's own thickness.
 */
export const domeRib: PartBuilder = (radius, rand) => {
  const thickness = radius * between(rand, 0.04, 0.055);
  const depth = radius * 0.07;
  const steps = 22;
  const segments: BufferGeometry[] = [];
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI;
    const a1 = ((i + 1) / steps) * Math.PI;
    const x0 = Math.cos(a0) * radius;
    const y0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius;
    const y1 = Math.sin(a1) * radius;
    // Overlap each chord slightly so the joints do not show as gaps.
    const len = Math.hypot(x1 - x0, y1 - y0) + thickness * 0.5;
    segments.push(
      new BoxGeometry(len, thickness, depth).applyMatrix4(
        new Matrix4()
          .makeTranslation((x0 + x1) / 2, (y0 + y1) / 2, 0)
          .multiply(new Matrix4().makeRotationZ(Math.atan2(y1 - y0, x1 - x0))),
      ),
    );
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

export const BUILDERS = {
  spurGear,
  ringGear,
  knurledCollar,
  lensBarrel,
  bearing,
  boltedFlange,
  turbineHub,
  spacerRing,
  spokedWheel,
  castellatedCrown,
  cylinderBank,
  finnedCollar,
  hexBoss,
  lobedCam,
  slottedDisc,
  retainingRing,
  lensGroup,
  gearCluster,
  domeRib,
  mountingRing,
  crownPlate,
} as const;

export type PartName = keyof typeof BUILDERS;

export const PART_NAMES = Object.keys(BUILDERS) as PartName[];
