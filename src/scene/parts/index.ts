import type { BufferGeometry } from 'three';
import { hashString, mulberry32 } from '../layout';
import { BUILDERS, PART_NAMES, type PartName } from './builders';

/** One archetype per language, so each cluster reads as a related sub-assembly. */
const BY_LANGUAGE: Record<string, PartName> = {
  TypeScript: 'lensBarrel',
  JavaScript: 'knurledCollar',
  Java: 'spurGear',
  Python: 'bearing',
  HTML: 'boltedFlange',
  CSS: 'spacerRing',
  'Jupyter Notebook': 'turbineHub',
  Ruby: 'ringGear',
  C: 'boltedFlange',
  'C++': 'boltedFlange',
};

/** Languages outside the table get a stable archetype derived from their name. */
export function partNameFor(language: string): PartName {
  return BY_LANGUAGE[language] ?? PART_NAMES[hashString(language) % PART_NAMES.length];
}

export interface PartSpec {
  id: string;
  language: string;
  radius: number;
}

/**
 * Builds a part for one repository. The archetype comes from its language and every
 * free dimension is drawn from a PRNG seeded on the repo id, so a repo always gets
 * the same part and no two parts are identical.
 */
export function createPart({ id, language, radius }: PartSpec): BufferGeometry {
  const rand = mulberry32(hashString(id));
  return BUILDERS[partNameFor(language)](radius, rand);
}

export { BUILDERS, PART_NAMES, type PartName } from './builders';
