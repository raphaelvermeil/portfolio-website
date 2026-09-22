import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { activityScore } from '../src/lib/activity';
import { parseSite } from '../src/lib/content';
import { applyOverride, isHidden, parseOverrides, type OverrideMap } from '../src/lib/overrides';
import type { Meta, Project } from '../src/lib/types';

export type Fetcher = (url: string) => Promise<{ status: number; json: () => Promise<unknown> }>;

export interface FetchDeps {
  fetcher: Fetcher;
  readText(path: string): Promise<string>;
  writeText(path: string, text: string): Promise<void>;
  exists(path: string): boolean;
  log(msg: string): void;
  now(): Date;
}

export const OUTPUT = {
  projects: 'src/data/projects.json',
  languages: 'src/data/languages.json',
  meta: 'src/data/meta.json',
} as const;

const API = 'https://api.github.com';
const README_LINES = 40;
const CONCURRENCY = 5;

interface GitHubRepo {
  name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  size: number;
  pushed_at: string;
  topics?: string[];
  fork: boolean;
  archived: boolean;
}

interface GitHubUser {
  avatar_url: string;
  html_url: string;
  name: string | null;
  bio: string | null;
}

async function getJson<T>(deps: FetchDeps, url: string): Promise<T> {
  const res = await deps.fetcher(url);
  if (res.status < 200 || res.status >= 300) throw new Error(`GitHub API ${res.status} for ${url}`);
  return (await res.json()) as T;
}

async function getReadme(deps: FetchDeps, user: string, name: string): Promise<string | null> {
  const res = await deps.fetcher(`${API}/repos/${user}/${name}/readme`);
  if (res.status === 404) return null;
  if (res.status < 200 || res.status >= 300) throw new Error(`GitHub API ${res.status} for readme of ${name}`);
  const body = (await res.json()) as { content: string };
  const text = Buffer.from(body.content, 'base64').toString('utf8');
  return text.split('\n').slice(0, README_LINES).join('\n');
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function fetchAll(user: string, overrides: OverrideMap, deps: FetchDeps) {
  const now = deps.now();
  const [profile, repos] = await Promise.all([
    getJson<GitHubUser>(deps, `${API}/users/${user}`),
    getJson<GitHubRepo[]>(deps, `${API}/users/${user}/repos?per_page=100&type=owner`),
  ]);

  const kept = repos.filter((r) => !r.fork && !r.archived && !isHidden(r.name, overrides));
  deps.log(`fetched ${repos.length} repos, keeping ${kept.length}`);

  const projects = await mapLimit(kept, CONCURRENCY, async (r): Promise<Project> => {
    const [languages, readmeExcerpt] = await Promise.all([
      getJson<Record<string, number>>(deps, `${API}/repos/${user}/${r.name}/languages`),
      getReadme(deps, user, r.name),
    ]);
    const base: Project = {
      id: r.name,
      title: r.name,
      blurb: r.description,
      url: r.html_url,
      homepage: r.homepage && r.homepage.length > 0 ? r.homepage : null,
      language: r.language,
      languages,
      stars: r.stargazers_count,
      sizeKb: r.size,
      pushedAt: r.pushed_at,
      topics: r.topics ?? [],
      readmeExcerpt,
      featured: false,
      image: null,
      activity: Math.round(activityScore({ stars: r.stargazers_count, sizeKb: r.size, pushedAt: r.pushed_at }, now) * 1000) / 1000,
    };
    return applyOverride(base, overrides[r.name]);
  });

  projects.sort((a, b) => b.activity - a.activity || a.id.localeCompare(b.id));

  const languageTotals: Record<string, number> = {};
  for (const p of projects) {
    for (const [lang, bytes] of Object.entries(p.languages)) languageTotals[lang] = (languageTotals[lang] ?? 0) + bytes;
  }

  const meta: Meta = {
    fetchedAt: now.toISOString(),
    avatarUrl: profile.avatar_url,
    profileUrl: profile.html_url,
    name: profile.name ?? user,
    bio: profile.bio,
  };

  return { projects, languages: languageTotals, meta };
}

export async function run(deps: FetchDeps): Promise<number> {
  const site = parseSite(await deps.readText('content/site.yml'));
  const overrides = parseOverrides(await deps.readText('content/projects.yml'));
  try {
    const { projects, languages, meta } = await fetchAll(site.github, overrides, deps);
    await deps.writeText(OUTPUT.projects, JSON.stringify(projects, null, 2) + '\n');
    await deps.writeText(OUTPUT.languages, JSON.stringify(languages, null, 2) + '\n');
    await deps.writeText(OUTPUT.meta, JSON.stringify(meta, null, 2) + '\n');
    deps.log(`wrote ${projects.length} projects to ${OUTPUT.projects}`);
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const haveData = Object.values(OUTPUT).every((p) => deps.exists(p));
    if (haveData) {
      deps.log(`WARNING: GitHub fetch failed (${message}); keeping existing data`);
      return 0;
    }
    deps.log(`ERROR: GitHub fetch failed (${message}) and no existing data to fall back on`);
    return 1;
  }
}

const realFetcher: Fetcher = async (url) => {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'portfolio-fetch-script',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  return { status: res.status, json: () => res.json() };
};

const realDeps: FetchDeps = {
  fetcher: realFetcher,
  readText: (p) => readFile(p, 'utf8'),
  writeText: async (p, t) => {
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, t, 'utf8');
  },
  exists: existsSync,
  log: (m) => console.log(`[sync] ${m}`),
  now: () => new Date(),
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(realDeps)
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(`[sync] ERROR: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    });
}
