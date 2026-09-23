import type { BufferGeometry } from 'three';
import { hashString, mulberry32 } from '../../lib/random';
import { BUILDERS, type PartName } from './builders';

/**
 * Builds one archetype. Every free dimension comes from a PRNG seeded on `seed`,
 * so a part is stable across rebuilds while no two instances are identical.
 */
export function buildPart(name: PartName, radius: number, seed: string): BufferGeometry {
  return BUILDERS[name](radius, mulberry32(hashString(seed)));
}

export { BUILDERS, PART_NAMES, type PartName } from './builders';
