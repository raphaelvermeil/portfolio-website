import type { PartName } from './parts';

export interface AssemblyPart {
  name: PartName;
  radius: number;
}

/**
 * The machine, composed by hand rather than derived from the repo list.
 *
 * Read left to right it runs intake → case → gear train → optics: the rhythm
 * alternates heavy and light so the silhouette never flattens out, and the two
 * largest parts anchor the ends.
 */
export const ASSEMBLY: AssemblyPart[] = [
  { name: 'turbineHub', radius: 0.95 },
  { name: 'castellatedCrown', radius: 1.1 },
  { name: 'spokedWheel', radius: 1.32 },
  { name: 'finnedCollar', radius: 1.12 },
  { name: 'cylinderBank', radius: 1.5 },
  { name: 'hexBoss', radius: 0.6 },
  { name: 'slottedDisc', radius: 1.22 },
  { name: 'spurGear', radius: 0.78 },
  { name: 'spurGear', radius: 1.02 },
  { name: 'ringGear', radius: 1.16 },
  { name: 'lobedCam', radius: 1.04 },
  { name: 'bearing', radius: 1.26 },
  { name: 'retainingRing', radius: 1.3 },
  { name: 'knurledCollar', radius: 1.14 },
  { name: 'lensBarrel', radius: 1.3 },
  { name: 'lensGroup', radius: 1.54 },
  { name: 'retainingRing', radius: 1.6 },
];
