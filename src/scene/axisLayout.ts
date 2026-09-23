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
  position: [number, number, number];
  quaternion: [number, number, number, number];
  radius: number;
}

export interface AxisLayout {
  placements: GearPlacement[];
  /** Distance from the first part's outer face to the last one's. */
  length: number;
}

/** Air between neighbouring parts, as a share of the larger one's depth. */
const GAP_RATIO = 1.6;
const GAP_MIN = 0.45;

/** Parts lie along +X; their own spin axis (+Z) is rotated to match. */
const AXIS = new Vector3(1, 0, 0);
const PART_AXIS = new Vector3(0, 0, 1);

function spacing(a: AxisItem, b: AxisItem): number {
  return Math.max(GAP_MIN, Math.max(a.depth, b.depth) * GAP_RATIO);
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

export function axisLayout(items: AxisItem[]): AxisLayout {
  const ordered = orderItems(items);
  if (ordered.length === 0) return { placements: [], length: 0 };

  const quaternion = new Quaternion().setFromUnitVectors(PART_AXIS, AXIS);
  const q: [number, number, number, number] = [quaternion.x, quaternion.y, quaternion.z, quaternion.w];

  const offsets: number[] = [0];
  for (let i = 1; i < ordered.length; i++) {
    offsets.push(offsets[i - 1] + spacing(ordered[i - 1], ordered[i]));
  }

  const length = offsets[offsets.length - 1];
  const centre = length / 2;

  return {
    length,
    placements: ordered.map((item, i) => ({
      id: item.id,
      language: languageLabel(item.language),
      position: [offsets[i] - centre, 0, 0],
      quaternion: q,
      radius: item.radius,
    })),
  };
}
