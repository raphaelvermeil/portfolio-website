import { describe, expect, it } from 'vitest';
import { ASSEMBLY } from '../scene/assembly';
import { projects } from './data';
import { layerCounts, reposForLayer, usesTech } from './layerRepos';
import type { Project } from './types';

function project(id: string, languages: Record<string, number>, readme: string | null = null): Project {
  return {
    id,
    title: id,
    blurb: null,
    url: '',
    homepage: null,
    language: Object.keys(languages)[0] ?? null,
    languages,
    stars: 0,
    sizeKb: 0,
    pushedAt: '2026-01-01T00:00:00Z',
    topics: [],
    readme,
    featured: false,
    image: null,
    activity: 0,
  };
}

describe('usesTech', () => {
  it('matches a language the repo is written in, whatever the casing', () => {
    expect(usesTech(project('a', { TypeScript: 100 }), 'typescript')).toBe(true);
    expect(usesTech(project('a', { Go: 100 }), 'Go')).toBe(true);
  });

  it('matches a framework named in the readme', () => {
    expect(usesTech(project('a', { TypeScript: 1 }, 'Built with Next.js and Tailwind.'), 'Next.js')).toBe(true);
  });

  it('does not match a tech the repo never mentions', () => {
    expect(usesTech(project('a', { Java: 1 }, 'A pathfinder.'), 'MongoDB')).toBe(false);
  });

  it('requires a whole word, so Go does not match prose', () => {
    expect(usesTech(project('a', { Java: 1 }, 'Going to the shops. Ignore golang.'), 'Go')).toBe(false);
  });

  it('is case sensitive on readme prose, so "node" in a sentence is not Node', () => {
    expect(usesTech(project('a', { Java: 1 }, 'Each node of the tree.'), 'Node')).toBe(false);
    expect(usesTech(project('a', { Java: 1 }, 'Runs on Node.'), 'Node')).toBe(true);
  });

  it('treats a dot in the name literally, not as any character', () => {
    expect(usesTech(project('a', { TypeScript: 1 }, 'Uses NextXjs somehow.'), 'Next.js')).toBe(false);
  });
});

describe('reposForLayer', () => {
  const all = [
    project('web', { TypeScript: 10 }, 'A Next.js app.'),
    project('api', { Go: 10 }, 'A service.'),
    project('notebook', { Python: 10 }, 'Uses pandas.'),
  ];

  it('returns every repo matching any of the layer technologies', () => {
    const layer = { tech: ['TypeScript', 'React'] };
    expect(reposForLayer(layer.tech, all).map((p) => p.id)).toEqual(['web']);
  });

  it('lets a repo belong to more than one layer, because it does', () => {
    const interfaceRepos = reposForLayer(['TypeScript'], all).map((p) => p.id);
    const serviceRepos = reposForLayer(['Go', 'TypeScript'], all).map((p) => p.id);
    expect(interfaceRepos).toContain('web');
    expect(serviceRepos).toContain('web');
    expect(serviceRepos).toContain('api');
  });

  it('preserves the order the repos came in', () => {
    expect(reposForLayer(['TypeScript', 'Go', 'Python'], all).map((p) => p.id)).toEqual([
      'web',
      'api',
      'notebook',
    ]);
  });

  it('returns nothing for a layer no repo uses', () => {
    expect(reposForLayer(['Fortran'], all)).toEqual([]);
  });
});

describe('layerCounts', () => {
  it('counts matching repos per layer id', () => {
    const all = [project('a', { TypeScript: 1 }), project('b', { Go: 1 })];
    const counts = layerCounts([{ id: 'ui', tech: ['TypeScript'] }, { id: 'svc', tech: ['Go'] }], all);
    expect(counts).toEqual({ ui: 1, svc: 1 });
  });
});

describe('casing in prose', () => {
  it('matches a lowercase mention of an unambiguous tool', () => {
    expect(usesTech(project('a', { Go: 1 }, 'Run docker-compose up.'), 'Docker')).toBe(true);
  });

  it('still refuses a lowercase mention of a tech that is also plain English', () => {
    expect(usesTech(project('a', { Java: 1 }, 'Visit each node.'), 'Node')).toBe(false);
  });
});

describe('against the real repo data', () => {
  it('matches at least one repo for every layer of the stack', () => {
    // A layer that matches nothing would filter the grid to an empty list, which
    // the UI has no state for. This fails loudly if a data refresh breaks that.
    const counts = layerCounts(ASSEMBLY, projects);
    for (const layer of ASSEMBLY) {
      expect(counts[layer.id], `${layer.label} matches no repo`).toBeGreaterThan(0);
    }
  });
});
