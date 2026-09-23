import { hashString, mulberry32 } from '../../lib/random';
import { BUILDERS, toPieces, type PartName, type PartPieces } from './builders';

/**
 * Builds one archetype. Every free dimension comes from a PRNG seeded on `seed`,
 * so a part is stable across rebuilds while no two instances are identical.
 */
export function buildPart(name: PartName, radius: number, seed: string): PartPieces {
  return toPieces(BUILDERS[name](radius, mulberry32(hashString(seed))));
}

export { BUILDERS, PART_NAMES, type Mover, type PartName, type PartPieces } from './builders';
