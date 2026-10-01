import type { Project } from './types';

/**
 * Terms that are ordinary English as well as technologies, so a match in prose
 * only counts when the capitalisation does too: "each node of the tree" is not
 * Node, and "going" is not Go. Everything else matches either way on casing,
 * because a README is as likely to say "dockerised" as "Docker".
 */
const CASE_SENSITIVE_IN_PROSE = new Set(['Go', 'C', 'CI', 'Node']);

/** Escapes a technology name so "Next.js" matches literally rather than as a pattern. */
function pattern(tech: string): RegExp {
  const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, CASE_SENSITIVE_IN_PROSE.has(tech) ? '' : 'i');
}

/**
 * Whether a repo uses a technology, on the evidence in the repo itself.
 *
 * Two sources, deliberately different in strictness. A language is structured
 * data from the GitHub API, so an exact key match either way on casing is safe.
 * A framework only appears in prose, where the match has to be whole-word, and
 * case sensitive for the handful of names that are also plain English.
 */
export function usesTech(project: Project, tech: string): boolean {
  const target = tech.toLowerCase();
  if (Object.keys(project.languages).some((language) => language.toLowerCase() === target)) {
    return true;
  }
  const prose = `${project.readme ?? ''}\n${project.blurb ?? ''}`;
  return pattern(tech).test(prose);
}

/** Every repo using any of a layer's technologies, in the order given. */
export function reposForLayer(tech: string[], all: Project[]): Project[] {
  return all.filter((project) => tech.some((t) => usesTech(project, t)));
}

/** How many repos each layer matches, keyed by layer id. */
export function layerCounts(
  layers: { id: string; tech: string[] }[],
  all: Project[],
): Record<string, number> {
  return Object.fromEntries(layers.map((layer) => [layer.id, reposForLayer(layer.tech, all).length]));
}
