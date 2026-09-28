import { loadYaml } from './yaml';
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
  const doc = loadYaml(yamlText);
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

/**
 * Applies the whole override file to fetched repositories: drops the hidden
 * ones and rewrites the rest.
 *
 * This runs when the app loads, not when the data is fetched, so editing
 * content/projects.yml takes effect immediately — a blurb should not need a
 * network round trip to appear.
 */
export function applyOverrides(projects: Project[], overrides: OverrideMap): Project[] {
  return projects
    .filter((project) => !isHidden(project.id, overrides))
    .map((project) => applyOverride(project, overrides[project.id]));
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
