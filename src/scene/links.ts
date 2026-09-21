import type { GearPlacement } from './layout';

export interface Shaft {
  a: string;
  b: string;
  language: string;
}

export interface Belt {
  a: string;
  b: string;
  mid: [number, number, number];
}

export interface LinkGraph {
  shafts: Shaft[];
  belts: Belt[];
  spinDir: Record<string, 1 | -1>;
}

const BELT_BULGE = 1.25;

function dist(a: GearPlacement, b: GearPlacement): number {
  return Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1], a.position[2] - b.position[2]);
}

/** Prim's algorithm over a small cluster. */
function spanningTree(cluster: GearPlacement[]): Shaft[] {
  if (cluster.length < 2) return [];
  const inTree = new Set<number>([0]);
  const edges: Shaft[] = [];
  while (inTree.size < cluster.length) {
    let best: { i: number; j: number; d: number } | null = null;
    for (const i of inTree) {
      for (let j = 0; j < cluster.length; j++) {
        if (inTree.has(j)) continue;
        const d = dist(cluster[i], cluster[j]);
        if (!best || d < best.d) best = { i, j, d };
      }
    }
    inTree.add(best!.j);
    edges.push({ a: cluster[best!.i].id, b: cluster[best!.j].id, language: cluster[best!.i].language });
  }
  return edges;
}

function closestPair(x: GearPlacement[], y: GearPlacement[]): [GearPlacement, GearPlacement] {
  let best: [GearPlacement, GearPlacement] = [x[0], y[0]];
  let bestD = Infinity;
  for (const a of x) {
    for (const b of y) {
      const d = dist(a, b);
      if (d < bestD) {
        bestD = d;
        best = [a, b];
      }
    }
  }
  return best;
}

function assignSpin(cluster: GearPlacement[], shafts: Shaft[], out: Record<string, 1 | -1>): void {
  const adj = new Map<string, string[]>();
  for (const p of cluster) adj.set(p.id, []);
  for (const s of shafts) {
    adj.get(s.a)!.push(s.b);
    adj.get(s.b)!.push(s.a);
  }
  for (const p of cluster) {
    if (p.id in out) continue;
    out[p.id] = 1;
    const queue = [p.id];
    while (queue.length) {
      const id = queue.shift()!;
      for (const n of adj.get(id)!) {
        if (n in out) continue;
        out[n] = out[id] === 1 ? -1 : 1;
        queue.push(n);
      }
    }
  }
}

export function buildLinks(placements: GearPlacement[]): LinkGraph {
  const clusters: GearPlacement[][] = [];
  const byLanguage = new Map<string, GearPlacement[]>();
  for (const p of placements) {
    if (!byLanguage.has(p.language)) {
      const list: GearPlacement[] = [];
      byLanguage.set(p.language, list);
      clusters.push(list);
    }
    byLanguage.get(p.language)!.push(p);
  }

  const shafts: Shaft[] = [];
  const spinDir: Record<string, 1 | -1> = {};
  for (const cluster of clusters) {
    const tree = spanningTree(cluster);
    shafts.push(...tree);
    assignSpin(cluster, tree, spinDir);
  }

  const belts: Belt[] = [];
  for (let i = 1; i < clusters.length; i++) {
    const [a, b] = closestPair(clusters[i - 1], clusters[i]);
    const mid: [number, number, number] = [
      ((a.position[0] + b.position[0]) / 2) * BELT_BULGE,
      ((a.position[1] + b.position[1]) / 2) * BELT_BULGE,
      ((a.position[2] + b.position[2]) / 2) * BELT_BULGE,
    ];
    belts.push({ a: a.id, b: b.id, mid });
  }

  return { shafts, belts, spinDir };
}
