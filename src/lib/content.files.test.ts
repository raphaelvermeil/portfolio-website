import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseSite, parseSkills, parseTimeline } from './content';
import { parseOverrides } from './overrides';

const read = (p: string) => readFileSync(new URL(`../../content/${p}`, import.meta.url), 'utf8');

describe('content files', () => {
  it('site.yml parses with required fields', () => {
    const site = parseSite(read('site.yml'));
    expect(site.name.length).toBeGreaterThan(0);
    expect(site.github.length).toBeGreaterThan(0);
  });

  it('skills.yml parses into at least one group', () => {
    expect(parseSkills(read('skills.yml')).length).toBeGreaterThan(0);
  });

  it('experience.yml parses into at least one entry', () => {
    expect(parseTimeline(read('experience.yml'), 'experience.yml').length).toBeGreaterThan(0);
  });

  it('education.yml parses into at least one entry', () => {
    expect(parseTimeline(read('education.yml'), 'education.yml').length).toBeGreaterThan(0);
  });

  it('projects.yml parses', () => {
    expect(() => parseOverrides(read('projects.yml'))).not.toThrow();
  });

  it('about.md is non-empty', () => {
    expect(read('about.md').trim().length).toBeGreaterThan(0);
  });
});
