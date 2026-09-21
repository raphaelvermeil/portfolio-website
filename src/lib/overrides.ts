import { load } from 'js-yaml';
import type { Project } from './types';

export interface ProjectOverride {
  title?: string;
  blurb?: string;
  hidden?: boolean;
  featured?: boolean;
  image?: string;
  homepage?: string;
}

export type OverrideMap = Record<string, ProjectOverride>;

const ALLOWED = new Set(['title', 'blurb', 'hidden', 'featured', 'image', 'homepage']);

export function parseOverrides(yamlText: string): OverrideMap {
  let doc;
  try {
    doc = load(yamlText);
  } catch (e) {
    // Empty input or comment-only input
    return {};
  }
  if (doc === null || doc === undefined) return {};
  if (typeof doc !== 'object' || Array.isArray(doc)) throw new Error('projects.yml must be a map of repo name → overrides');
  const out: OverrideMap = {};
  for (const [name, value] of Object.entries(doc as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) throw new Error(`override for "${name}" must be a map`);
    for (const key of Object.keys(value)) {
      if (!ALLOWED.has(key)) throw new Error(`override for "${name}" has unknown field "${key}"`);
    }
    out[name] = value as ProjectOverride;
  }
  return out;
}

export function isHidden(name: string, overrides: OverrideMap): boolean {
  return overrides[name]?.hidden === true;
}

export function applyOverride(project: Project, override: ProjectOverride | undefined): Project {
  if (!override) return project;
  return {
    ...project,
    title: override.title ?? project.title,
    blurb: override.blurb ?? project.blurb,
    homepage: override.homepage ?? project.homepage,
    image: override.image ?? project.image,
    featured: override.featured ?? project.featured,
  };
}
