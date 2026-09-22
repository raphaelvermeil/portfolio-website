import { describe, expect, it } from 'vitest';
import { PART_NAMES, createPart, partNameFor } from './index';

describe('partNameFor', () => {
  it('maps known languages to their archetype', () => {
    expect(partNameFor('TypeScript')).toBe('lensBarrel');
    expect(partNameFor('Python')).toBe('bearing');
    expect(partNameFor('Jupyter Notebook')).toBe('turbineHub');
  });

  it('gives unknown languages a stable archetype from the set', () => {
    const first = partNameFor('Brainfuck');
    expect(PART_NAMES).toContain(first);
    expect(partNameFor('Brainfuck')).toBe(first);
  });

  it('keeps "Other" stable too', () => {
    expect(PART_NAMES).toContain(partNameFor('Other'));
  });
});

describe('createPart', () => {
  const spec = { id: 'pathfinding', language: 'Java', radius: 1.1 };

  it('builds geometry for a repo', () => {
    expect(createPart(spec).getAttribute('position').count).toBeGreaterThan(0);
  });

  it('is deterministic per repo id', () => {
    expect(Array.from(createPart(spec).getAttribute('position').array)).toEqual(
      Array.from(createPart(spec).getAttribute('position').array),
    );
  });

  it('gives two repos of one language different dimensions', () => {
    const a = createPart({ id: 'alpha', language: 'JavaScript', radius: 1 });
    const b = createPart({ id: 'omega', language: 'JavaScript', radius: 1 });
    expect(a.getAttribute('position').count).not.toBe(b.getAttribute('position').count);
  });
});
