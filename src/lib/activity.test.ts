import { describe, expect, it } from 'vitest';
import { activityScore, radiusFor } from './activity';

const NOW = new Date('2026-09-21T00:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

describe('activityScore', () => {
  it('is 1 for a repo pushed today with many stars and large size', () => {
    expect(activityScore({ stars: 15, sizeKb: 10_000, pushedAt: daysAgo(0) }, NOW)).toBeCloseTo(1, 1);
  });

  it('is 0 for a two-year-old empty repo with no stars', () => {
    expect(activityScore({ stars: 0, sizeKb: 0, pushedAt: daysAgo(730) }, NOW)).toBe(0);
  });

  it('never leaves [0, 1]', () => {
    expect(activityScore({ stars: 100_000, sizeKb: 1e9, pushedAt: daysAgo(0) }, NOW)).toBeLessThanOrEqual(1);
    expect(activityScore({ stars: 0, sizeKb: 0, pushedAt: daysAgo(5000) }, NOW)).toBeGreaterThanOrEqual(0);
  });

  it('increases with stars and with recency', () => {
    const base = { stars: 0, sizeKb: 100, pushedAt: daysAgo(365) };
    expect(activityScore({ ...base, stars: 3 }, NOW)).toBeGreaterThan(activityScore(base, NOW));
    expect(activityScore({ ...base, pushedAt: daysAgo(30) }, NOW)).toBeGreaterThan(activityScore(base, NOW));
  });

  it('weights recency 0.5, stars 0.3, size 0.2', () => {
    expect(activityScore({ stars: 0, sizeKb: 0, pushedAt: daysAgo(0) }, NOW)).toBeCloseTo(0.5, 5);
    expect(activityScore({ stars: 15, sizeKb: 0, pushedAt: daysAgo(730) }, NOW)).toBeCloseTo(0.3, 5);
    expect(activityScore({ stars: 0, sizeKb: 9999, pushedAt: daysAgo(730) }, NOW)).toBeCloseTo(0.2, 5);
  });
});

describe('radiusFor', () => {
  it('maps 0..1 to 0.6..1.6', () => {
    expect(radiusFor(0)).toBe(0.6);
    expect(radiusFor(1)).toBe(1.6);
    expect(radiusFor(0.5)).toBeCloseTo(1.1, 10);
  });
});
