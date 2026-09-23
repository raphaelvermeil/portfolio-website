import type { PartMotion } from './motion';
import type { PartName } from './parts';

export interface AssemblyPart {
  name: PartName;
  radius: number;
  motion: PartMotion;
}

/**
 * The machine, composed by hand rather than derived from the repo list.
 *
 * Read left to right it runs intake → case → gear train → optics: the rhythm
 * alternates heavy and light so the silhouette never flattens out, and the two
 * largest parts anchor the ends.
 *
 * Motion is varied deliberately. Continuous spins run at different rates and in
 * both directions, escapements tick and dwell, one collar only rocks, and two
 * parts stay still while their own pieces move — the crown's segments pulse in a
 * travelling wave and the radial engine's pistons reciprocate on opposed phases.
 * Nothing should look like it shares a driveshaft with its neighbour.
 */
export const ASSEMBLY: AssemblyPart[] = [
  { name: 'turbineHub', radius: 0.95, motion: { kind: 'spin', turnsPerSecond: 0.5 } },
  { name: 'castellatedCrown', radius: 1.1, motion: { kind: 'still' } },
  { name: 'spokedWheel', radius: 1.32, motion: { kind: 'tick', steps: 20, ticksPerSecond: 1 } },
  { name: 'finnedCollar', radius: 1.12, motion: { kind: 'spin', turnsPerSecond: -0.18 } },
  { name: 'cylinderBank', radius: 1.5, motion: { kind: 'spin', turnsPerSecond: 0.07 } },
  { name: 'hexBoss', radius: 0.6, motion: { kind: 'still' } },
  { name: 'slottedDisc', radius: 1.22, motion: { kind: 'spin', turnsPerSecond: -0.26 } },
  { name: 'gearCluster', radius: 1.18, motion: { kind: 'spin', turnsPerSecond: -0.04 } },
  { name: 'spurGear', radius: 0.78, motion: { kind: 'spin', turnsPerSecond: 0.44 } },
  { name: 'spurGear', radius: 1.02, motion: { kind: 'tick', steps: 14, ticksPerSecond: 2, direction: -1 } },
  { name: 'ringGear', radius: 1.16, motion: { kind: 'spin', turnsPerSecond: 0.15 } },
  { name: 'lobedCam', radius: 1.04, motion: { kind: 'spin', turnsPerSecond: -0.62 } },
  { name: 'bearing', radius: 1.26, motion: { kind: 'spin', turnsPerSecond: 0.11 } },
  { name: 'retainingRing', radius: 1.3, motion: { kind: 'still' } },
  { name: 'knurledCollar', radius: 1.14, motion: { kind: 'rock', degrees: 16, hz: 0.28 } },
  { name: 'lensBarrel', radius: 1.3, motion: { kind: 'spin', turnsPerSecond: 0.08 } },
  { name: 'lensGroup', radius: 1.54, motion: { kind: 'tick', steps: 36, ticksPerSecond: 0.8 } },
  { name: 'retainingRing', radius: 1.6, motion: { kind: 'spin', turnsPerSecond: -0.05 } },
];
