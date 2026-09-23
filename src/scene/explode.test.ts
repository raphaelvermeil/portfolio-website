import { describe, expect, it } from 'vitest';
import { scrollExplode } from './explode';

const HERO = 2400;
const VIEWPORT = 1000;
const RUNWAY = HERO - VIEWPORT;

describe('scrollExplode', () => {
  it('is 0 at the top and 1 once the runway is used up', () => {
    expect(scrollExplode(0, HERO, VIEWPORT)).toBe(0);
    expect(scrollExplode(RUNWAY, HERO, VIEWPORT)).toBe(1);
  });

  it('runs linearly in between', () => {
    expect(scrollExplode(RUNWAY / 2, HERO, VIEWPORT)).toBeCloseTo(0.5, 6);
    expect(scrollExplode(RUNWAY / 4, HERO, VIEWPORT)).toBeCloseTo(0.25, 6);
  });

  it('clamps past either end', () => {
    expect(scrollExplode(-500, HERO, VIEWPORT)).toBe(0);
    expect(scrollExplode(HERO * 4, HERO, VIEWPORT)).toBe(1);
  });

  it('stays closed when the hero is not taller than the viewport', () => {
    expect(scrollExplode(300, 900, 900)).toBe(0);
    expect(scrollExplode(300, 0, 900)).toBe(0);
  });
});
