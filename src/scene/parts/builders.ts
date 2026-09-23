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

/** Every builder returns a geometry centred on the origin whose spin axis is +Z. */
export type PartBuilder = (radius: number, rand: () => number) => BufferGeometry;

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
  return merge([body, ...ring(teeth, merlon, (a) => atAngle(a, radius * 0.81))]);
};

/** Radial bank of cylinders around a central case. */
export const cylinderBank: PartBuilder = (radius, rand) => {
  const depth = radius * between(rand, 0.34, 0.46);
  const cases = countBetween(rand, 5, 8);
  const cylinder = toZAxis(new CylinderGeometry(radius * 0.26, radius * 0.26, depth, 14));
  const head = toZAxis(new CylinderGeometry(radius * 0.3, radius * 0.3, depth * 0.22, 14));
  head.translate(0, 0, depth * 0.55);
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
  const bank = merge([cylinder, head]);
  return merge([boss, plate, ...ring(cases, bank, (a) => atAngle(a, radius * 0.66))]);
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
} as const;

export type PartName = keyof typeof BUILDERS;

export const PART_NAMES = Object.keys(BUILDERS) as PartName[];
