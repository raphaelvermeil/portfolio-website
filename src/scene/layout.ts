import { Quaternion, Vector3 } from 'three';
import { languageLabel } from '../lib/palette';
import { teethFor } from './gearGeometry';

export interface LayoutItem {
  id: string;
  language: string | null;
  radius: number;
}

export interface GearPlacement {
  id: string;
  language: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  radius: number;
  teeth: number;
}

export interface Sector {
  language: string;
  start: number;
  width: number;
}

export const SHELL_MIN = 6;
export const SHELL_MAX = 8;
export const GAP = 0.4;
const MIN_SECTOR = 0.5;
const LATITUDE_LIMIT = Math.PI / 3;
const RELAX_ITERATIONS = 80;
const GOLDEN = 0.618033988749895;

export function hashString(s: string): number {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function groupByLanguage(items: LayoutItem[]): Map<string, LayoutItem[]> {
  const groups = new Map<string, LayoutItem[]>();
  for (const item of items) {
    const lang = languageLabel(item.language);
    if (!groups.has(lang)) groups.set(lang, []);
    groups.get(lang)!.push(item);
  }
  for (const list of groups.values()) list.sort((a, b) => a.id.localeCompare(b.id));
  return groups;
}

export function assignSectors(items: LayoutItem[]): Sector[] {
  const groups = groupByLanguage(items);
  const langs = [...groups.keys()].sort((a, b) => groups.get(b)!.length - groups.get(a)!.length || a.localeCompare(b));
  const raw = langs.map((l) => Math.max(MIN_SECTOR, (groups.get(l)!.length / items.length) * Math.PI * 2));
  const scale = (Math.PI * 2) / raw.reduce((s, w) => s + w, 0);
  let start = 0;
  return langs.map((language, i) => {
    const width = raw[i] * scale;
    const sector = { language, start, width };
    start += width;
    return sector;
  });
}

function relax(positions: Vector3[], radii: number[], rand: () => number): void {
  const axis = new Vector3();
  for (let iter = 0; iter < RELAX_ITERATIONS; iter++) {
    let moved = false;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const need = radii[i] + radii[j] + GAP;
        axis.subVectors(positions[j], positions[i]);
        let d = axis.length();
        if (d >= need) continue;
        if (d < 1e-6) {
          axis.set(rand() - 0.5, rand() - 0.5, rand() - 0.5);
          d = axis.length();
        }
        axis.multiplyScalar(((need - d) / 2 + 1e-4) / d);
        positions[i].sub(axis);
        positions[j].add(axis);
        moved = true;
      }
    }
    if (!moved) return;
  }
}

export function layoutGears(items: LayoutItem[]): GearPlacement[] {
  const seed = hashString([...items.map((i) => i.id)].sort().join('|'));
  const rand = mulberry32(seed);
  const groups = groupByLanguage(items);
  const sectors = assignSectors(items);

  const ordered: LayoutItem[] = [];
  const positions: Vector3[] = [];
  const radii: number[] = [];

  for (const sector of sectors) {
    const list = groups.get(sector.language)!;
    list.forEach((item, i) => {
      const theta = sector.start + ((i + 0.5) / list.length) * sector.width + (rand() - 0.5) * 0.3;
      const lat = (-1 + 2 * ((i * GOLDEN + rand() * 0.1) % 1)) * LATITUDE_LIMIT;
      const r = SHELL_MIN + rand() * (SHELL_MAX - SHELL_MIN);
      ordered.push(item);
      positions.push(new Vector3(r * Math.cos(lat) * Math.cos(theta), r * Math.sin(lat), r * Math.cos(lat) * Math.sin(theta)));
      radii.push(item.radius);
    });
  }

  relax(positions, radii, rand);

  const up = new Vector3(0, 0, 1);
  return ordered.map((item, i) => {
    const dir = positions[i].clone().normalize();
    dir.x += (rand() - 0.5) * 0.4;
    dir.y += (rand() - 0.5) * 0.4;
    dir.z += (rand() - 0.5) * 0.4;
    dir.normalize();
    const q = new Quaternion().setFromUnitVectors(up, dir);
    return {
      id: item.id,
      language: languageLabel(item.language),
      position: [positions[i].x, positions[i].y, positions[i].z],
      quaternion: [q.x, q.y, q.z, q.w],
      radius: item.radius,
      teeth: teethFor(item.radius),
    };
  });
}
