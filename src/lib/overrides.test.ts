import { describe, expect, it } from 'vitest';
import type { Project } from './types';
import { applyOverride, isHidden, parseOverrides } from './overrides';

const base: Project = {
  id: 'pathfinding',
  title: 'pathfinding',
  blurb: null,
  url: 'https://github.com/raphaelvermeil/pathfinding',
  homepage: null,
  language: 'Java',
  languages: { Java: 100 },
  stars: 0,
  sizeKb: 10,
  pushedAt: '2025-11-21T00:00:00Z',
  topics: [],
  readmeExcerpt: null,
  featured: false,
  image: null,
  activity: 0.3,
};

describe('parseOverrides', () => {
  it('parses a map keyed by repo name', () => {
    const map = parseOverrides('pathfinding:\n  title: Pathfinding\n  featured: true\nfoo:\n  hidden: true\n');
    expect(map.pathfinding).toEqual({ title: 'Pathfinding', featured: true });
    expect(map.foo).toEqual({ hidden: true });
  });

  it('returns an empty map for empty or comment-only input', () => {
    expect(parseOverrides('')).toEqual({});
    expect(parseOverrides('# nothing here\n')).toEqual({});
  });

  it('rejects unknown fields', () => {
    expect(() => parseOverrides('x:\n  colour: red\n')).toThrow(/unknown field "colour"/);
  });
});

describe('isHidden', () => {
  it('is true only when hidden: true', () => {
    expect(isHidden('a', { a: { hidden: true } })).toBe(true);
    expect(isHidden('a', { a: { hidden: false } })).toBe(false);
    expect(isHidden('a', {})).toBe(false);
  });
});

describe('applyOverride', () => {
  it('returns the project unchanged when there is no override', () => {
    expect(applyOverride(base, undefined)).toEqual(base);
  });

  it('replaces title, blurb, homepage, image and featured', () => {
    const out = applyOverride(base, {
      title: 'Pathfinding',
      blurb: 'A* on a grid',
      homepage: 'https://example.com',
      image: '/img/pf.png',
      featured: true,
    });
    expect(out).toMatchObject({
      title: 'Pathfinding',
      blurb: 'A* on a grid',
      homepage: 'https://example.com',
      image: '/img/pf.png',
      featured: true,
    });
    expect(out.id).toBe('pathfinding');
  });

  it('keeps GitHub values for fields not overridden', () => {
    const out = applyOverride({ ...base, blurb: 'from github', homepage: 'https://gh.example' }, { title: 'X' });
    expect(out.blurb).toBe('from github');
    expect(out.homepage).toBe('https://gh.example');
    expect(out.featured).toBe(false);
  });
});
