import type { PartMotion } from './motion';
import type { PartName } from './parts';

export type RegionId = 'logic' | 'learning' | 'vision' | 'motor' | 'language' | 'memory';

export interface RegionPart {
  name: PartName;
  radius: number;
  motion: PartMotion;
}

export interface BrainRegion {
  id: RegionId;
  label: string;
  domain: string;
  color: string;
  /** Repo ids this region's work lives in. Must exist and must not be hidden. */
  repos: string[];
  /** Seat on the dome, in degrees: azimuth about +Y, elevation up from the XZ plane. */
  azimuth: number;
  elevation: number;
  parts: RegionPart[];
}

/**
 * The cranial frame.
 *
 * Not a region: it carries no label and does not explode, so the regions
 * separate out of something that stays put. A rib is a full meridian, so eight
 * of them spaced over 180° of azimuth close the whole dome.
 */
export interface FramePart {
  id: string;
  name: PartName;
  radius: number;
  /** Degrees about +Y. */
  azimuth: number;
}

const RIBS = 8;

export const FRAME_PARTS: FramePart[] = [
  ...Array.from({ length: RIBS }, (_, i) => ({
    id: `rib-${i}`,
    name: 'domeRib' as PartName,
    radius: 2.6,
    azimuth: (i / RIBS) * 180,
  })),
  { id: 'base', name: 'mountingRing', radius: 2.6, azimuth: 0 },
  { id: 'crown', name: 'crownPlate', radius: 0.45, azimuth: 0 },
];

/**
 * The six regions, each pairing a real brain function with a domain the repos
 * demonstrate. No pairing is asserted: every one is checkable against the grid.
 *
 * Archetype choice carries the meaning — meshing trains for Logic, optics for
 * Vision, pistons for Motor, platters for Memory. That is what earns the
 * mechanism its place: the gears are not decoration standing in for software,
 * they are the part of the machine that does that kind of thinking.
 *
 * Elevations alternate high and low around the dome so neighbouring clusters
 * separate in two dimensions rather than one.
 */
export const REGIONS: BrainRegion[] = [
  {
    id: 'logic',
    label: 'Logic',
    domain: 'Algorithms & data structures',
    color: '#4fa3ff',
    repos: ['pathfinding', 'pathfinding2', 'caterpiller', 'quicklink'],
    azimuth: 0,
    elevation: 40,
    parts: [
      { name: 'gearCluster', radius: 0.34, motion: { kind: 'spin', turnsPerSecond: -0.05 } },
      { name: 'spurGear', radius: 0.25, motion: { kind: 'spin', turnsPerSecond: 0.3 } },
      { name: 'lobedCam', radius: 0.23, motion: { kind: 'spin', turnsPerSecond: -0.42 } },
      { name: 'spokedWheel', radius: 0.3, motion: { kind: 'tick', steps: 20, ticksPerSecond: 1 } },
    ],
  },
  {
    id: 'learning',
    label: 'Learning',
    domain: 'Machine learning',
    color: '#ffa64d',
    repos: ['NeuralNetwork', 'neural-critters', 'McWicsHackathon', 'pandas-marketingdata-prep'],
    azimuth: 60,
    elevation: 56,
    parts: [
      { name: 'turbineHub', radius: 0.31, motion: { kind: 'spin', turnsPerSecond: 0.46 } },
      { name: 'finnedCollar', radius: 0.26, motion: { kind: 'spin', turnsPerSecond: -0.2 } },
      { name: 'slottedDisc', radius: 0.29, motion: { kind: 'spin', turnsPerSecond: 0.12 } },
    ],
  },
  {
    id: 'vision',
    label: 'Vision',
    domain: 'Graphics & simulation',
    color: '#c58cff',
    repos: ['learn-shaders', 'BridgeOrBust', 'neural-critters'],
    azimuth: 130,
    elevation: 40,
    parts: [
      { name: 'lensGroup', radius: 0.33, motion: { kind: 'tick', steps: 36, ticksPerSecond: 0.8 } },
      { name: 'lensBarrel', radius: 0.27, motion: { kind: 'spin', turnsPerSecond: 0.08 } },
      { name: 'retainingRing', radius: 0.3, motion: { kind: 'still' } },
    ],
  },
  {
    id: 'motor',
    label: 'Motor',
    domain: 'Games & robotics',
    color: '#5fd67a',
    repos: ['BridgeOrBust', 'caterpiller', 'treasurehunt', 'ecse-211-robot', 'GearMeUp'],
    azimuth: 190,
    elevation: 56,
    parts: [
      { name: 'cylinderBank', radius: 0.34, motion: { kind: 'spin', turnsPerSecond: 0.06 } },
      { name: 'castellatedCrown', radius: 0.26, motion: { kind: 'still' } },
      { name: 'bearing', radius: 0.29, motion: { kind: 'spin', turnsPerSecond: 0.14 } },
    ],
  },
  {
    id: 'language',
    label: 'Language',
    domain: 'Interfaces & APIs',
    color: '#3fbfb0',
    repos: [
      'ECSEGAMES',
      'enggames-partners',
      'mern-chat-app',
      'gen-z-translator',
      'GearMeUp',
      'fakeCodePolisher',
    ],
    azimuth: 250,
    elevation: 40,
    parts: [
      { name: 'boltedFlange', radius: 0.33, motion: { kind: 'still' } },
      { name: 'hexBoss', radius: 0.2, motion: { kind: 'still' } },
      { name: 'knurledCollar', radius: 0.26, motion: { kind: 'rock', degrees: 14, hz: 0.26 } },
      { name: 'spacerRing', radius: 0.3, motion: { kind: 'spin', turnsPerSecond: -0.07 } },
    ],
  },
  {
    id: 'memory',
    label: 'Memory',
    domain: 'Data & storage',
    color: '#d8453a',
    repos: ['pandas-marketingdata-prep', 'mern-chat-app', 'gen-z-translator', 'ECSEGAMES'],
    azimuth: 310,
    elevation: 56,
    parts: [
      { name: 'slottedDisc', radius: 0.31, motion: { kind: 'spin', turnsPerSecond: 0.1 } },
      { name: 'ringGear', radius: 0.27, motion: { kind: 'spin', turnsPerSecond: 0.16 } },
      { name: 'retainingRing', radius: 0.3, motion: { kind: 'still' } },
    ],
  },
];

export const regionById: Record<string, BrainRegion> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r]),
);
