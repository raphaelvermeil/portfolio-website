import { describe, expect, it } from 'vitest';
import { parseSite, parseSkills } from './content';

describe('parseSite', () => {
  it('parses required and optional fields', () => {
    const site = parseSite('name: R\ntagline: T\nrole: Builder\ngithub: rv\nemail: a@b.c\nlinkedin: https://l\nresume: /r.pdf\n');
    expect(site).toEqual({ name: 'R', tagline: 'T', role: 'Builder', github: 'rv', email: 'a@b.c', linkedin: 'https://l', resume: '/r.pdf' });
  });

  it('defaults optional fields to null', () => {
    const site = parseSite('name: R\ntagline: T\ngithub: rv\nemail: a@b.c\n');
    expect(site.linkedin).toBeNull();
    expect(site.resume).toBeNull();
  });

  it('falls back to the tagline when no role is given', () => {
    expect(parseSite('name: R\ntagline: T\ngithub: rv\nemail: a@b.c\n').role).toBe('T');
  });

  it('throws when a required field is missing', () => {
    expect(() => parseSite('name: R\n')).toThrow(/site.yml is missing "tagline"/);
  });
});

describe('parseSkills', () => {
  it('parses groups of items', () => {
    expect(parseSkills('- group: Languages\n  items: [TypeScript, Java]\n')).toEqual([
      { group: 'Languages', items: ['TypeScript', 'Java'] },
    ]);
  });

  it('returns [] for empty input', () => {
    expect(parseSkills('')).toEqual([]);
  });

  it('throws on a malformed group', () => {
    expect(() => parseSkills('- items: [x]\n')).toThrow(/skills.yml entry 0 needs "group" and "items"/);
  });
});
