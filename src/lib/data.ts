import projectsJson from '../data/projects.json';
import languagesJson from '../data/languages.json';
import metaJson from '../data/meta.json';
import type { Meta, Project } from './types';

export const projects = projectsJson as unknown as Project[];
export const languageBytes = languagesJson as Record<string, number>;
export const meta = metaJson as Meta;

export const projectById: Record<string, Project> = Object.fromEntries(projects.map((p) => [p.id, p]));
