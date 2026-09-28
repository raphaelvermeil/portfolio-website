import overridesRaw from '../../content/projects.yml?raw';
import projectsJson from '../data/projects.json';
import languagesJson from '../data/languages.json';
import metaJson from '../data/meta.json';
import { applyOverrides, parseOverrides } from './overrides';
import type { Meta, Project } from './types';

// Double cast: the JSON's per-object literal types don't overlap Project (heterogeneous `languages` keys).
export const projects = applyOverrides(
  projectsJson as unknown as Project[],
  parseOverrides(overridesRaw),
);
export const languageBytes = languagesJson as Record<string, number>;
export const meta = metaJson as Meta;

export const projectById: Record<string, Project> = Object.fromEntries(projects.map((p) => [p.id, p]));
