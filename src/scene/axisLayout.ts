import { Quaternion, Vector3 } from 'three';
import { languageLabel } from '../lib/palette';

export interface AxisItem {
  id: string;
  language: string | null;
  radius: number;
  /** Extent of the built part along its own spin axis. */
  depth: number;
}

export interface GearPlacement {
  id: string;
  language: string;
  /** Offset along the axis when the machine is closed up. */
  assembled: number;
  /** Offset along the axis when it is pulled fully apart. */
  exploded: number;
  quaternion: [number, number, number, number];
  radius: number;
}

/** Where a part sits for a given explode factor, 0 (closed) to 1 (apart). */
export function partX(placement: GearPlacement, explode: number): number {
  return placement.assembled + (placement.exploded - placement.assembled) * explode;
}

export interface AxisLayout {
  placements: GearPlacement[];
  /** Axial extent when closed up. */
  assembledLength: number;
  /** Axial extent when pulled fully apart. */
  explodedLength: number;
}

/** Air between neighbouring parts, as a share of the larger one's depth. */
const GAP_RATIO = 1.6;
const GAP_MIN = 0.62;
/** A hair of daylight between seated faces, so edges never z-fight. */
const SEAT_CLEARANCE = 0.05;

/** Parts lie along +X; their own spin axis (+Z) is rotated to match. */
const AXIS = new Vector3(1, 0, 0);
const PART_AXIS = new Vector3(0, 0, 1);

/** Centre-to-centre distance with the parts pulled apart. */
function explodedStep(a: AxisItem, b: AxisItem): number {
  return Math.max(GAP_MIN, Math.max(a.depth, b.depth) * GAP_RATIO);
}

/** Centre-to-centre distance with the parts stacked face to face. */
function assembledStep(a: AxisItem, b: AxisItem): number {
  return (a.depth + b.depth) / 2 + SEAT_CLEARANCE;
}

/**
 * Orders parts into one exploded assembly.
 *
 * Languages form contiguous runs so each cluster reads as a sub-assembly, the
 * largest run sits in the middle where the machine is visually heaviest, and
 * within a run parts descend by radius so each cluster tapers outward.
 */
export function orderItems(items: AxisItem[]): AxisItem[] {
  const groups = new Map<string, AxisItem[]>();
  for (const item of items) {
    const lang = languageLabel(item.language);
    if (!groups.has(lang)) groups.set(lang, []);
    groups.get(lang)!.push(item);
  }
  for (const run of groups.values()) {
    run.sort((a, b) => b.radius - a.radius || a.id.localeCompare(b.id));
  }

  const runs = [...groups.entries()]
    .sort(([aName, a], [bName, b]) => b.length - a.length || aName.localeCompare(bName))
    .map(([, run]) => run);

  // Biggest run to the centre, the rest alternating outward from it.
  const left: AxisItem[][] = [];
  const right: AxisItem[][] = [];
  runs.forEach((run, i) => (i % 2 === 0 ? right : left).push(run));
  return [...left.reverse().flat(), ...right.flat()];
}

/** Places parts along the axis in the order given. */
export function axisLayout(items: AxisItem[]): AxisLayout {
  if (items.length === 0) return { placements: [], assembledLength: 0, explodedLength: 0 };

  const quaternion = new Quaternion().setFromUnitVectors(PART_AXIS, AXIS);
  const q: [number, number, number, number] = [quaternion.x, quaternion.y, quaternion.z, quaternion.w];

  const exploded: number[] = [0];
  const assembled: number[] = [0];
  for (let i = 1; i < items.length; i++) {
    exploded.push(exploded[i - 1] + explodedStep(items[i - 1], items[i]));
    assembled.push(assembled[i - 1] + assembledStep(items[i - 1], items[i]));
  }

  const explodedLength = exploded[exploded.length - 1];
  const assembledLength = assembled[assembled.length - 1];

  return {
    explodedLength,
    assembledLength,
    placements: items.map((item, i) => ({
      id: item.id,
      language: languageLabel(item.language),
      assembled: assembled[i] - assembledLength / 2,
      exploded: exploded[i] - explodedLength / 2,
      quaternion: q,
      radius: item.radius,
    })),
  };
}
