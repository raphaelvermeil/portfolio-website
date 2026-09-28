import { describe, expect, it } from 'vitest';
import { countWords, numberWords, revealAmount, sectionProgress } from './reveal';

describe('revealAmount', () => {
  const TOTAL = 10;

  it('starts every word grey and ends every word inked', () => {
    for (let i = 0; i < TOTAL; i++) {
      expect(revealAmount(0, i, TOTAL)).toBe(0);
      expect(revealAmount(1, i, TOTAL)).toBe(1);
    }
  });

  it('lights words in reading order', () => {
    const midway = Array.from({ length: TOTAL }, (_, i) => revealAmount(0.5, i, TOTAL));
    for (let i = 1; i < TOTAL; i++) expect(midway[i]).toBeLessThanOrEqual(midway[i - 1]);
    expect(midway[0]).toBe(1);
    expect(midway[TOTAL - 1]).toBe(0);
  });

  it('keeps a band of words part-lit rather than flicking one at a time', () => {
    const partial = Array.from({ length: TOTAL }, (_, i) => revealAmount(0.5, i, TOTAL)).filter(
      (v) => v > 0 && v < 1,
    );
    expect(partial.length).toBeGreaterThan(0);
  });

  it('never runs backwards as the reader scrolls on', () => {
    for (let i = 0; i < TOTAL; i++) {
      let previous = 0;
      for (let p = 0; p <= 1; p += 0.01) {
        const v = revealAmount(p, i, TOTAL);
        expect(v).toBeGreaterThanOrEqual(previous - 1e-9);
        previous = v;
      }
    }
  });

  it('stays within 0..1 for any input', () => {
    for (const p of [-2, 0, 0.3, 1, 5]) {
      for (const i of [0, 3, 9]) {
        const v = revealAmount(p, i, TOTAL);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('copes with an empty passage', () => {
    expect(revealAmount(0.5, 0, 0)).toBe(0);
  });
});

describe('sectionProgress', () => {
  it('is 0 before the section starts and 1 once it has passed', () => {
    expect(sectionProgress(0, 2000, 800)).toBe(0);
    expect(sectionProgress(-1200, 2000, 800)).toBe(1);
  });

  it('runs linearly through the middle', () => {
    expect(sectionProgress(-600, 2000, 800)).toBeCloseTo(0.5, 6);
  });

  it('clamps past either end', () => {
    expect(sectionProgress(500, 2000, 800)).toBe(0);
    expect(sectionProgress(-5000, 2000, 800)).toBe(1);
  });

  it('treats a section no taller than the viewport as all-or-nothing', () => {
    expect(sectionProgress(10, 800, 800)).toBe(0);
    expect(sectionProgress(-10, 800, 800)).toBe(1);
  });
});

describe('numberWords', () => {
  const text = 'One two three.\n\nFour five.\n\n\nSix.';

  it('splits into paragraphs of words', () => {
    const paragraphs = numberWords(text);
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0].map((w) => w.word)).toEqual(['One', 'two', 'three.']);
    expect(paragraphs[1].map((w) => w.word)).toEqual(['Four', 'five.']);
  });

  it('numbers continuously across paragraphs', () => {
    const indices = numberWords(text).flat().map((w) => w.index);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('agrees with countWords', () => {
    expect(numberWords(text).flat()).toHaveLength(countWords(text));
  });

  it('ignores blank input', () => {
    expect(numberWords('   \n\n  ')).toEqual([]);
    expect(countWords('   ')).toBe(0);
  });
});
