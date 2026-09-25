import { describe, expect, it } from 'vitest';
import { percent, skillShares } from './skills';

describe('skillShares', () => {
  // Totals 1000, so Shell sits at 0.5% — unambiguously below the threshold.
  const bytes = { TypeScript: 600, Java: 300, Python: 95, Shell: 5 };

  it('shares sum to the whole, largest first', () => {
    const shares = skillShares(bytes);
    expect(shares.map((s) => s.language)).toEqual(['TypeScript', 'Java', 'Python']);
    expect(shares[0].share).toBeCloseTo(0.6, 6);
  });

  it('drops slivers below one percent', () => {
    expect(skillShares(bytes).find((s) => s.language === 'Shell')).toBeUndefined();
  });

  it('gives each language its palette colour', () => {
    expect(skillShares(bytes)[0].color).toBe('#4fa3ff');
  });

  it('handles no data', () => {
    expect(skillShares({})).toEqual([]);
    expect(skillShares({ Java: 0 })).toEqual([]);
  });

  it('breaks ties by name so the order is stable', () => {
    expect(skillShares({ Zig: 50, Ada: 50 }).map((s) => s.language)).toEqual(['Ada', 'Zig']);
  });
});

describe('percent', () => {
  it('rounds to whole percents', () => {
    expect(percent(0.244)).toBe('24%');
    expect(percent(1)).toBe('100%');
  });
});
