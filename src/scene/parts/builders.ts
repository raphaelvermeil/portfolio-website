import {
  Box3,
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Matrix4,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MoverMotion } from '../motion';

/** A sub-assembly that moves independently of the layer carrying it. */
export interface Mover {
  /** Centred on its own origin, so it can turn about itself. */
  geometry: BufferGeometry;
  /** Where it sits within the layer. */
  offset: [number, number, number];
  motion: MoverMotion;
}

export interface PartPieces {
  /** The layer's own structure, which moves with the layer. */
  body: BufferGeometry;
  movers: Mover[];
}

/**
 * Builders return a geometry centred on the origin whose axis is +Z, or a body
 * plus movers when the layer has pieces of its own that move.
 */
export type PartBuilder = (radius: number, rand: () => number) => BufferGeometry | PartPieces;

const Y_TO_Z = new Matrix4().makeRotationX(Math.PI / 2);

/**
 * Radial facets must stay below Gear's EdgesGeometry threshold (EDGE_THRESHOLD_DEG),
 * otherwise every seam of a revolved surface is drawn and the part reads as netting
 * instead of a machined solid. 36 segments → 10° facets.
 */
const RADIAL_SEGMENTS = 36;

/**
 * Half-width of a layer's plate, as a share of its nominal radius.
 *
 * The camera frames the machine as a cylinder of radius `max(radius)`, so a
 * square plate has to fit inside that circle: at 0.72 its corners reach
 * 0.72·√2 ≈ 1.02 radii, which the framing margin absorbs. Raise it and the
 * corners clip out of frame.
 */
const PLATE = 0.72;

/** Three's cylinders are built around +Y; the scene stacks along +Z. */
function toZAxis<T extends BufferGeometry>(geometry: T): T {
  geometry.applyMatrix4(Y_TO_Z);
  return geometry;
}

/** Levels indexing before merging, then recentres: sub-forms are placed relative to each other. */
function merge(parts: BufferGeometry[]): BufferGeometry {
  const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(flat, false) ?? flat[0];
  merged.computeBoundingBox();
  const box = merged.boundingBox!;
  merged.translate(
    -(box.min.x + box.max.x) / 2,
    -(box.min.y + box.max.y) / 2,
    -(box.min.z + box.max.z) / 2,
  );
  return merged;
}

/**
 * Builds a layer from body parts and movers laid out in one design space.
 *
 * `merge` recentres the body on its bounding box, which a layer built upward
 * off a base plate is never symmetric about. The movers are positioned in the
 * same space, so they take the identical shift — otherwise they float off their
 * mountings by however far the body moved.
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

/** A layer's base plate: square, thin, centred on the origin. */
function plate(half: number, thickness: number): BufferGeometry {
  return new BoxGeometry(half * 2, half * 2, thickness);
}

/** A box placed in the layer's design space. */
function block(w: number, h: number, d: number, x: number, y: number, z: number): BufferGeometry {
  const geometry = new BoxGeometry(w, h, d);
  geometry.translate(x, y, z);
  return geometry;
}

/** Four walls and a floor: a crate, open at the top. */
function openBox(span: number, height: number, thickness: number): BufferGeometry {
  const edge = span / 2 - thickness / 2;
  return merge([
    block(span, thickness, height, 0, edge, 0),
    block(span, thickness, height, 0, -edge, 0),
    block(thickness, span - thickness * 2, height, edge, 0, 0),
    block(thickness, span - thickness * 2, height, -edge, 0, 0),
    block(span, span, thickness, 0, 0, -(height / 2 - thickness / 2)),
  ]);
}

/**
 * The interface: a layout wireframe. Header bar, sidebar, and a grid of content
 * tiles, the lower two of which lift off the surface like components mounting.
 */
export const interfacePlate: PartBuilder = (radius, rand) => {
  const half = radius * PLATE;
  const base = 0.07;
  const lift = base / 2 + 0.025;
  const face = 0.09;
  const inset = between(rand, 0.04, 0.08) * half;

  const tileW = half * 0.52 - inset;
  const tileH = half * 0.4 - inset;
  const columns = [-half * 0.04, half * 0.68];

  const tiles: BufferGeometry[] = [];
  const movers: Mover[] = [];
  columns.forEach((x, column) => {
    tiles.push(block(tileW, tileH, face, x, half * 0.3, lift));
    movers.push({
      geometry: new BoxGeometry(tileW, tileH, face),
      offset: [x, -half * 0.3, lift],
      motion: { kind: 'reciprocate', travel: 0.07, hz: 0.5, phase: column * 0.5 },
    });
  });

  return assemble(
    [
      plate(half, base),
      block(half * 1.76, half * 0.2, face, 0, half * 0.76, lift),
      block(half * 0.4, half * 1.1, face, -half * 0.76, -half * 0.1, lift),
      ...tiles,
    ],
    movers,
  );
};

/**
 * The services: a board of discrete blocks joined by routed channels, with work
 * rising off the rails between them on staggered beats.
 */
export const serviceBoard: PartBuilder = (radius, rand) => {
  const half = radius * PLATE;
  const base = 0.07;
  const lift = base / 2;
  const rail = half * 0.07;
  const tall = between(rand, 0.16, 0.24);

  const seats: [number, number][] = [
    [-half * 0.5, half * 0.5],
    [half * 0.52, half * 0.46],
    [-half * 0.46, -half * 0.52],
    [half * 0.5, -half * 0.5],
  ];
  const blocks = seats.map(([x, y]) =>
    block(half * between(rand, 0.44, 0.6), half * between(rand, 0.38, 0.54), tall, x, y, lift + tall / 2),
  );

  const cube = half * 0.17;
  const stops: [number, number][] = [
    [-half * 0.56, 0],
    [half * 0.56, 0],
    [0, -half * 0.56],
  ];
  const movers: Mover[] = stops.map(([x, y], i) => ({
    geometry: new BoxGeometry(cube, cube, cube),
    offset: [x, y, lift + 0.04 + cube / 2],
    motion: { kind: 'reciprocate', travel: 0.1, hz: 0.45, phase: i / stops.length },
  }));

  return assemble(
    [
      plate(half, base),
      block(half * 1.84, rail, 0.04, 0, 0, lift + 0.02),
      block(rail, half * 1.84, 0.04, 0, 0, lift + 0.02),
      ...blocks,
    ],
    movers,
  );
};

/**
 * The data: a spindle of platters. The one honestly round layer, because a
 * stack of discs is what a database has looked like for fifty years, and the
 * top platter turns so the roundness is doing something.
 */
export const dataDiscs: PartBuilder = (radius, rand) => {
  const outer = radius * 0.86;
  const thick = 0.05;
  const gap = between(rand, 0.11, 0.15);
  const disc = (r: number) => toZAxis(new CylinderGeometry(r, r, thick, RADIAL_SEGMENTS));

  const lower = disc(outer);
  lower.translate(0, 0, -gap);

  return assemble(
    [toZAxis(new CylinderGeometry(radius * 0.1, radius * 0.1, gap * 2 + thick * 3, 18)), lower, disc(outer * 0.94)],
    [{ geometry: disc(outer * 0.88), offset: [0, 0, gap], motion: { kind: 'spin', turnsPerSecond: 0.18 } }],
  );
};

/**
 * The models: ranks of nodes on a radial web. Each rank rises a beat after the
 * one inside it, so a pulse travels outward through the net.
 */
export const modelLattice: PartBuilder = (radius, rand) => {
  const half = radius * PLATE;
  const base = 0.06;
  const lift = base / 2;
  const spokes = countBetween(rand, 6, 9);

  // Thin and short: heavier spokes read as an asterisk and swamp the nodes.
  const web = ring(spokes, block(half * 1.12, half * 0.022, 0.025, 0, 0, 0), (a) => atAngle(a, 0)).map(
    (g) => g.translate(0, 0, lift + 0.015),
  );

  const ranks: [number, number, number][] = [
    [0.3, 4, 0.1],
    [0.6, 6, 0.085],
    [0.88, 8, 0.072],
  ];
  const movers: Mover[] = ranks.map(([distance, count, size], i) => ({
    geometry: merge(ring(count, new BoxGeometry(half * size, half * size, half * size), (a) => atAngle(a, half * distance))),
    offset: [0, 0, lift + 0.09],
    motion: { kind: 'reciprocate', travel: 0.08, hz: 0.42, phase: i / ranks.length },
  }));

  return assemble([plate(half, base), ...web], movers);
};

/**
 * The delivery: a pallet carrying a crate, with a container lifting clear of it
 * — a build leaving for deployment.
 */
export const deliveryCrates: PartBuilder = (radius, rand) => {
  const half = radius * PLATE;
  const wall = half * 0.07;
  const height = between(rand, 0.3, 0.4);

  return assemble(
    [
      block(half * 1.96, half * 1.96, 0.05, 0, 0, -height / 2 - 0.025),
      openBox(half * 1.9, height, wall),
    ],
    [
      {
        geometry: openBox(half * 0.92, height * 0.72, wall * 0.85),
        offset: [0, 0, 0],
        motion: { kind: 'reciprocate', travel: 0.16, hz: 0.3, phase: 0 },
      },
    ],
  );
};

export const BUILDERS = {
  interfacePlate,
  serviceBoard,
  dataDiscs,
  modelLattice,
  deliveryCrates,
} as const;

export type PartName = keyof typeof BUILDERS;

export const PART_NAMES = Object.keys(BUILDERS) as PartName[];
