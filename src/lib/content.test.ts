import { describe, expect, it } from 'vitest';
import { parseSite, parseSkills, parseTimeline } from './content';

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

describe('parseTimeline', () => {
  it('parses an entry with required and optional fields', () => {
    const yaml = '- title: Intern\n  org: Acme\n  dates: May 2026 – Aug 2026\n  location: London\n  detail: Built things.\n';
    expect(parseTimeline(yaml, 'experience.yml')).toEqual([
      { title: 'Intern', org: 'Acme', dates: 'May 2026 – Aug 2026', location: 'London', detail: 'Built things.' },
    ]);
  });

  it('defaults optional fields to null', () => {
    const entry = parseTimeline('- title: BEng\n  org: McGill\n  dates: 2025 – 2029\n', 'education.yml')[0];
    expect(entry.location).toBeNull();
    expect(entry.detail).toBeNull();
  });

  it('returns [] for empty input', () => {
    expect(parseTimeline('', 'experience.yml')).toEqual([]);
  });

  it('throws on an entry missing a required field', () => {
    expect(() => parseTimeline('- title: Intern\n  org: Acme\n', 'experience.yml')).toThrow(
      /experience.yml entry 0 needs "title", "org" and "dates"/,
    );
  });
});
