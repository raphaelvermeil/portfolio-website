import { describe, expect, it } from 'vitest';
import { OUTPUT, fetchAll, run, type FetchDeps, type Fetcher } from './fetch-github';

const USER = 'rv';
const API = 'https://api.github.com';

function repo(name: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    full_name: `${USER}/${name}`,
    html_url: `https://github.com/${USER}/${name}`,
    description: null,
    homepage: null,
    language: 'Java',
    stargazers_count: 0,
    size: 100,
    pushed_at: '2026-09-01T00:00:00Z',
    topics: ['a'],
    fork: false,
    archived: false,
    ...extra,
  };
}

function routes(repos: unknown[], perRepo: Record<string, { languages?: unknown; readme?: { status: number; body?: unknown } }>) {
  const table: Record<string, { status: number; body: unknown }> = {
    [`${API}/users/${USER}`]: { status: 200, body: { avatar_url: 'https://a/x.png', html_url: `https://github.com/${USER}`, name: 'R V', bio: null } },
    [`${API}/users/${USER}/repos?per_page=100&type=owner`]: { status: 200, body: repos },
  };
  for (const [name, d] of Object.entries(perRepo)) {
    table[`${API}/repos/${USER}/${name}/languages`] = { status: 200, body: d.languages ?? { Java: 100 } };
    table[`${API}/repos/${USER}/${name}/readme`] = d.readme
      ? { status: d.readme.status, body: d.readme.body ?? {} }
      : { status: 200, body: { content: Buffer.from('# Title\nline2\n').toString('base64'), encoding: 'base64' } };
  }
  return table;
}

function fakeFetcher(table: Record<string, { status: number; body: unknown }>): Fetcher {
  return async (url) => {
    const r = table[url];
    if (!r) throw new Error(`unexpected URL ${url}`);
    return { status: r.status, json: async () => r.body };
  };
}

function fakeDeps(table: Record<string, { status: number; body: unknown }>, files: Record<string, string> = {}): FetchDeps & { files: Record<string, string>; logs: string[] } {
  const logs: string[] = [];
  return {
    files,
    logs,
    fetcher: fakeFetcher(table),
    readText: async (p) => {
      if (!(p in files)) throw new Error(`ENOENT ${p}`);
      return files[p];
    },
    writeText: async (p, t) => {
      files[p] = t;
    },
    exists: (p) => p in files,
    log: (m) => logs.push(m),
    now: () => new Date('2026-09-21T00:00:00Z'),
  };
}

describe('fetchAll', () => {
  it('drops forks, archived and hidden repos', async () => {
    const deps = fakeDeps(routes([repo('keep'), repo('fork', { fork: true }), repo('old', { archived: true }), repo('hid')], { keep: {} }));
    const { projects } = await fetchAll(USER, { hid: { hidden: true } }, deps);
    expect(projects.map((p) => p.id)).toEqual(['keep']);
  });

  it('collects languages, readme excerpt (first 40 lines) and computes activity', async () => {
    const longReadme = Array.from({ length: 60 }, (_, i) => `line ${i}`).join('\n');
    const deps = fakeDeps(
      routes([repo('a')], { a: { languages: { Java: 10, Python: 5 }, readme: { status: 200, body: { content: Buffer.from(longReadme).toString('base64'), encoding: 'base64' } } } }),
    );
    const { projects, languages } = await fetchAll(USER, {}, deps);
    expect(projects[0].languages).toEqual({ Java: 10, Python: 5 });
    expect(projects[0].readmeExcerpt?.split('\n')).toHaveLength(40);
    expect(projects[0].activity).toBeGreaterThan(0);
    expect(languages).toEqual({ Java: 10, Python: 5 });
  });

  it('treats a 404 README as null', async () => {
    const deps = fakeDeps(routes([repo('a')], { a: { readme: { status: 404 } } }));
    const { projects } = await fetchAll(USER, {}, deps);
    expect(projects[0].readmeExcerpt).toBeNull();
  });

  it('applies overrides and sorts by activity descending', async () => {
    const deps = fakeDeps(routes([repo('old', { pushed_at: '2024-01-01T00:00:00Z' }), repo('new')], { old: {}, new: {} }));
    const { projects } = await fetchAll(USER, { old: { title: 'Old One', featured: true } }, deps);
    expect(projects.map((p) => p.id)).toEqual(['new', 'old']);
    expect(projects[1]).toMatchObject({ title: 'Old One', featured: true });
  });

  it('fills meta from the user profile', async () => {
    const deps = fakeDeps(routes([], {}));
    const { meta } = await fetchAll(USER, {}, deps);
    expect(meta).toEqual({ fetchedAt: '2026-09-21T00:00:00.000Z', avatarUrl: 'https://a/x.png', profileUrl: `https://github.com/${USER}`, name: 'R V', bio: null });
  });

  it('throws on a non-404 error status', async () => {
    const table = routes([repo('a')], { a: {} });
    table[`${API}/repos/${USER}/a/languages`] = { status: 403, body: { message: 'rate limited' } };
    await expect(fetchAll(USER, {}, fakeDeps(table))).rejects.toThrow(/403/);
  });
});

describe('run', () => {
  const content = {
    'content/site.yml': `name: R\ntagline: T\ngithub: ${USER}\nemail: a@b.c\n`,
    'content/projects.yml': '',
  };

  it('writes the three data files and returns 0', async () => {
    const deps = fakeDeps(routes([repo('a')], { a: {} }), { ...content });
    expect(await run(deps)).toBe(0);
    expect(JSON.parse(deps.files[OUTPUT.projects])).toHaveLength(1);
    expect(JSON.parse(deps.files[OUTPUT.languages])).toEqual({ Java: 100 });
    expect(JSON.parse(deps.files[OUTPUT.meta]).name).toBe('R V');
  });

  it('keeps old data and returns 0 when the API fails but data exists', async () => {
    const deps = fakeDeps({}, { ...content, [OUTPUT.projects]: '[]', [OUTPUT.languages]: '{}', [OUTPUT.meta]: '{}' });
    expect(await run(deps)).toBe(0);
    expect(deps.files[OUTPUT.projects]).toBe('[]');
    expect(deps.logs.join('\n')).toMatch(/keeping existing data/);
  });

  it('returns 1 when the API fails and no data exists', async () => {
    const deps = fakeDeps({}, { ...content });
    expect(await run(deps)).toBe(1);
  });
});
