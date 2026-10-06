import { loadYaml } from './yaml';

export interface SiteConfig {
  name: string;
  /** Oversized line on the landing; falls back to the tagline. */
  role: string;
  tagline: string;
  github: string;
  email: string;
  linkedin: string | null;
  resume: string | null;
}

export interface SkillGroup {
  group: string;
  items: string[];
}

function requireString(obj: Record<string, unknown>, key: string, file: string): string {
  const v = obj[key];
  if (typeof v !== 'string' || v.length === 0) throw new Error(`${file} is missing "${key}"`);
  return v;
}

function optionalString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export function parseSite(yamlText: string): SiteConfig {
  const doc = (loadYaml(yamlText) ?? {}) as Record<string, unknown>;
  return {
    name: requireString(doc, 'name', 'site.yml'),
    tagline: requireString(doc, 'tagline', 'site.yml'),
    role: optionalString(doc, 'role') ?? requireString(doc, 'tagline', 'site.yml'),
    github: requireString(doc, 'github', 'site.yml'),
    email: requireString(doc, 'email', 'site.yml'),
    linkedin: optionalString(doc, 'linkedin'),
    resume: optionalString(doc, 'resume'),
  };
}

export function parseSkills(yamlText: string): SkillGroup[] {
  const doc = loadYaml(yamlText);
  if (doc === null || doc === undefined) return [];
  if (!Array.isArray(doc)) throw new Error('skills.yml must be a list');
  return doc.map((entry, i) => {
    const e = entry as Record<string, unknown>;
    if (typeof e?.group !== 'string' || !Array.isArray(e.items)) {
      throw new Error(`skills.yml entry ${i} needs "group" and "items"`);
    }
    return { group: e.group, items: e.items.map(String) };
  });
}

/**
 * One row of a dated list — a job or a degree. Both read the same way, so they
 * share a shape: what it was, where, when, and an optional line about it.
 */
export interface TimelineEntry {
  title: string;
  org: string;
  dates: string;
  location: string | null;
  detail: string | null;
}

export function parseTimeline(yamlText: string, file: string): TimelineEntry[] {
  const doc = loadYaml(yamlText);
  if (doc === null || doc === undefined) return [];
  if (!Array.isArray(doc)) throw new Error(`${file} must be a list`);
  return doc.map((entry, i) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    if (typeof e.title !== 'string' || typeof e.org !== 'string' || typeof e.dates !== 'string') {
      throw new Error(`${file} entry ${i} needs "title", "org" and "dates"`);
    }
    return {
      title: e.title,
      org: e.org,
      dates: e.dates,
      location: optionalString(e, 'location'),
      detail: optionalString(e, 'detail'),
    };
  });
}
