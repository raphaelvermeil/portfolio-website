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
    radius: 3.2,
    azimuth: (i / RIBS) * 180,
  })),
  { id: 'base', name: 'mountingRing', radius: 3.2, azimuth: 0 },
  { id: 'crown', name: 'crownPlate', radius: 0.55, azimuth: 0 },
];

/** Populated once the frame is confirmed to read as a cranium. */
export const REGIONS: BrainRegion[] = [];

export const regionById: Record<string, BrainRegion> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r]),
);
