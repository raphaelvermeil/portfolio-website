export interface ActivityInput {
  stars: number;
  sizeKb: number;
  pushedAt: string;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** 0..1 blend of recency (0.5), stars (0.3) and size (0.2). See spec §7.2. */
export function activityScore(input: ActivityInput, now: Date = new Date()): number {
  const days = (now.getTime() - new Date(input.pushedAt).getTime()) / 86_400_000;
  const recency = clamp01(1 - days / 730);
  const stars = clamp01(Math.log2(input.stars + 1) / 4);
  const size = clamp01(Math.log10(input.sizeKb + 1) / 4);
  return clamp01(0.5 * recency + 0.3 * stars + 0.2 * size);
}

export const RADIUS_MIN = 0.6;
export const RADIUS_RANGE = 1.0;

export function radiusFor(activity: number): number {
  return RADIUS_MIN + clamp01(activity) * RADIUS_RANGE;
}
