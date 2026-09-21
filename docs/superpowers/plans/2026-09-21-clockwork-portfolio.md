# Clockwork Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static portfolio site whose hero is a 3D "clockwork constellation" — one procedural blueprint-style gear per GitHub repo — with About / Skills / Contact sheets below, and repo data fetched from the GitHub API at build time.

**Architecture:** Vite + React + TypeScript app. A Node script (`scripts/fetch-github.ts`) writes committed JSON under `src/data/`. Pure TypeScript modules under `src/lib/` and `src/scene/*.ts` (activity score, overrides, gear geometry, layout, links) are unit-tested with Vitest; React components under `src/scene/*.tsx` and `src/ui/` render them with @react-three/fiber and are verified in the browser. A zustand store carries hovered/selected/filter state between the 3D scene and the HTML overlay.

**Tech Stack:** Vite 8, React 19.2, TypeScript 5.9, three 0.186, @react-three/fiber 9.7, @react-three/drei 10.7, @react-three/postprocessing 3.1, zustand 5, js-yaml 5, marked 18, dompurify 3, Vitest 5, tsx, pnpm, Node 20.

**Spec:** `docs/superpowers/specs/2026-09-21-clockwork-portfolio-design.md`

## Global Constraints

- Node 20, pnpm. Package manager commands in this plan are `pnpm ...`.
- React **19.2.x** exactly (`@react-three/fiber@9.7.0` peer-depends on `react >=19 <19.3`).
- `pnpm sync` (not `fetch` — that is a built-in pnpm command) runs the GitHub fetch script; `prebuild` runs it before `vite build`.
- Generated JSON under `src/data/` is **committed**.
- Colours (spec §9): background `#0b0f17`, ink `#dbe4f0`, muted `#7d8ba1`, grid `rgba(120,160,255,0.06)`, accent `#5ee1ff`. Language palette: TypeScript `#4fa3ff`, JavaScript `#ffd54a`, Java `#ff8a3d`, Python `#5fd67a`, HTML `#ff6b6b`, CSS `#c58cff`, Jupyter Notebook `#ffa64d`, Ruby `#ff4f6d`, C/C++ `#8fb3ff`, other `#9aa5b8`.
- Gear radius = `0.6 + activity`, activity in [0,1]. Tooth count = `clamp(round(radius * 14), 8, 28)`.
- Layout: shell radius 6–8, minimum gap between gears `rA + rB + 0.4`, deterministic (seeded by repo names).
- Scene: camera at distance 16, fov 45; fog 14→26; bloom intensity 0.6, threshold 0.2; bloom and dust disabled below 600px width; DPR capped at 2; `prefers-reduced-motion` → no auto-rotate, no dust drift, gears spin at 0.25×.
- Detail panel width `min(420px, 100vw)`; bottom sheet at 70vh when viewport ≤ 640px.
- Every commit message ends with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Tests: `pnpm test` must pass and `pnpm build` must succeed at the end of every task.

---

## File map

| Path | Responsibility |
|---|---|
| `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/vite-env.d.ts` | Scaffold |
| `src/styles/tokens.css`, `src/styles/global.css` | Design tokens and all component CSS (one stylesheet; classes are prefixed per component) |
| `src/lib/types.ts` | `Project`, `Meta` interfaces |
| `src/lib/palette.ts` | language → colour |
| `src/lib/activity.ts` | activity score + radius |
| `src/lib/overrides.ts` | parse `projects.yml`, apply overrides |
| `src/lib/content.ts` | parse `site.yml`, `skills.yml` (pure) |
| `src/lib/siteContent.ts` | imports the content files with `?raw` and exposes parsed values |
| `src/lib/data.ts` | typed access to generated JSON |
| `src/lib/store.ts` | zustand store |
| `src/lib/markdown.ts` | markdown → sanitised HTML |
| `src/lib/hooks.ts` | `useMediaQuery`, `useReducedMotion` |
| `src/lib/webgl.ts` | WebGL capability check |
| `scripts/fetch-github.ts` | fetch + write JSON (testable `run(deps)`) |
| `src/scene/gearGeometry.ts` | procedural spur gear |
| `src/scene/layout.ts` | seeded placement on a sphere shell |
| `src/scene/links.ts` | shafts, belts, spin directions |
| `src/scene/machine.ts` | computed placements + links for the real data |
| `src/scene/Gear.tsx`, `Links.tsx`, `GridBackdrop.tsx`, `Dust.tsx`, `CameraRig.tsx`, `Effects.tsx`, `Machine.tsx` | R3F components |
| `src/ui/MachineSection.tsx` | hero `<section>`: canvas + overlay + panel + keyboard cycling + WebGL fallback |
| `src/ui/HeroOverlay.tsx`, `Legend.tsx`, `DetailPanel.tsx`, `Sheet.tsx`, `sections/About.tsx`, `Skills.tsx`, `Contact.tsx`, `Footer.tsx` | HTML UI |
| `content/site.yml`, `about.md`, `skills.yml`, `projects.yml` | User-editable content |
| `.github/workflows/deploy.yml`, `README.md` | Deploy + docs |

---

### Task 1: Scaffold the Vite + React + TypeScript app with Vitest and the palette module

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `src/styles/tokens.css`, `src/styles/global.css`, `src/lib/palette.ts`
- Test: `src/lib/palette.test.ts`

**Interfaces:**
- Produces: `languageColor(lang: string | null): string`, `languageLabel(lang: string | null): string`, `OTHER_LANGUAGE = 'Other'`, `LANGUAGE_COLORS`.

- [ ] **Step 1: Write package.json and install**

```json
{
  "name": "portfolio",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "sync": "tsx scripts/fetch-github.ts",
    "prebuild": "pnpm sync",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@react-three/drei": "10.7.8",
    "@react-three/fiber": "9.7.0",
    "@react-three/postprocessing": "3.1.1",
    "dompurify": "3.4.15",
    "js-yaml": "5.4.2",
    "marked": "18.0.13",
    "postprocessing": "6.39.5",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "three": "0.186.0",
    "zustand": "5.0.15"
  },
  "devDependencies": {
    "@types/node": "26.6.2",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.7",
    "@types/three": "0.186.0",
    "@vitejs/plugin-react": "6.1.1",
    "jsdom": "^26.0.0",
    "tsx": "4.23.15",
    "typescript": "5.9.3",
    "vite": "8.3.0",
    "vitest": "5.0.1"
  }
}
```

Run: `pnpm install`
Expected: installs without peer-dependency errors (warnings about optional expo peers from @react-three/fiber are fine).

- [ ] **Step 2: Write tsconfig, vite config, env typings, .gitignore**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "scripts", "vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
});
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

`.gitignore`:
```
node_modules
dist
.DS_Store
*.local
```

- [ ] **Step 3: Write index.html, main.tsx, App.tsx, styles**

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="description" content="Raphael Vermeil — engineering portfolio" />
    <title>Raphael Vermeil</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx` (placeholder; replaced in Task 13):
```tsx
export default function App() {
  return (
    <main>
      <h1 className="placeholder">PORTFOLIO — SCAFFOLD</h1>
    </main>
  );
}
```

`src/styles/tokens.css`:
```css
:root {
  --bg: #0b0f17;
  --ink: #dbe4f0;
  --muted: #7d8ba1;
  --grid: rgba(120, 160, 255, 0.06);
  --accent: #5ee1ff;
  --line: rgba(219, 228, 240, 0.25);
  --panel: rgba(11, 15, 23, 0.85);
  --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --sans: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --gutter: clamp(16px, 4vw, 48px);
}
```

`src/styles/global.css` (base only for now; component classes are appended in later tasks):
```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  background-image:
    linear-gradient(var(--grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 48px 48px;
}

a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

h1,
h2,
h3,
.mono {
  font-family: var(--mono);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.label {
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.placeholder {
  padding: var(--gutter);
}
```

- [ ] **Step 4: Write the failing palette test**

`src/lib/palette.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { LANGUAGE_COLORS, OTHER_COLOR, OTHER_LANGUAGE, languageColor, languageLabel } from './palette';

describe('palette', () => {
  it('maps known languages to their colours', () => {
    expect(languageColor('TypeScript')).toBe('#4fa3ff');
    expect(languageColor('Java')).toBe('#ff8a3d');
    expect(languageColor('Jupyter Notebook')).toBe('#ffa64d');
  });

  it('falls back to the neutral colour for unknown or null', () => {
    expect(languageColor('Brainfuck')).toBe(OTHER_COLOR);
    expect(languageColor(null)).toBe(OTHER_COLOR);
  });

  it('labels null as Other', () => {
    expect(languageLabel(null)).toBe(OTHER_LANGUAGE);
    expect(languageLabel('Python')).toBe('Python');
  });

  it('has every palette entry as a 6-digit hex', () => {
    for (const hex of Object.values(LANGUAGE_COLORS)) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `./palette`.

- [ ] **Step 6: Implement palette.ts**

`src/lib/palette.ts`:
```ts
export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#4fa3ff',
  JavaScript: '#ffd54a',
  Java: '#ff8a3d',
  Python: '#5fd67a',
  HTML: '#ff6b6b',
  CSS: '#c58cff',
  'Jupyter Notebook': '#ffa64d',
  Ruby: '#ff4f6d',
  C: '#8fb3ff',
  'C++': '#8fb3ff',
};

export const OTHER_COLOR = '#9aa5b8';
export const OTHER_LANGUAGE = 'Other';

export function languageLabel(lang: string | null): string {
  return lang ?? OTHER_LANGUAGE;
}

export function languageColor(lang: string | null): string {
  if (lang === null) return OTHER_COLOR;
  return LANGUAGE_COLORS[lang] ?? OTHER_COLOR;
}
```

- [ ] **Step 7: Run tests and build**

Run: `pnpm test && pnpm build`
Expected: 4 tests pass. Build: `prebuild` fails because `scripts/fetch-github.ts` does not exist yet — **for this task only**, run `npx tsc --noEmit && npx vite build` instead and expect `dist/index.html` to be produced.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS app with palette module

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Project types and activity score

**Files:**
- Create: `src/lib/types.ts`, `src/lib/activity.ts`
- Test: `src/lib/activity.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface Project { id: string; title: string; blurb: string | null; url: string; homepage: string | null; language: string | null; languages: Record<string, number>; stars: number; sizeKb: number; pushedAt: string; topics: string[]; readmeExcerpt: string | null; featured: boolean; image: string | null; activity: number }
  interface Meta { fetchedAt: string; avatarUrl: string; profileUrl: string; name: string; bio: string | null }
  activityScore(input: { stars: number; sizeKb: number; pushedAt: string }, now?: Date): number  // 0..1
  radiusFor(activity: number): number  // 0.6 + activity
  ```

- [ ] **Step 1: Write types.ts**

`src/lib/types.ts`:
```ts
export interface Project {
  id: string;
  title: string;
  blurb: string | null;
  url: string;
  homepage: string | null;
  language: string | null;
  languages: Record<string, number>;
  stars: number;
  sizeKb: number;
  pushedAt: string;
  topics: string[];
  readmeExcerpt: string | null;
  featured: boolean;
  image: string | null;
  activity: number;
}

export interface Meta {
  fetchedAt: string;
  avatarUrl: string;
  profileUrl: string;
  name: string;
  bio: string | null;
}
```

- [ ] **Step 2: Write the failing activity test**

`src/lib/activity.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { activityScore, radiusFor } from './activity';

const NOW = new Date('2026-09-21T00:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

describe('activityScore', () => {
  it('is 1 for a repo pushed today with many stars and large size', () => {
    expect(activityScore({ stars: 15, sizeKb: 10_000, pushedAt: daysAgo(0) }, NOW)).toBeCloseTo(1, 1);
  });

  it('is 0 for a two-year-old empty repo with no stars', () => {
    expect(activityScore({ stars: 0, sizeKb: 0, pushedAt: daysAgo(730) }, NOW)).toBe(0);
  });

  it('never leaves [0, 1]', () => {
    expect(activityScore({ stars: 100_000, sizeKb: 1e9, pushedAt: daysAgo(0) }, NOW)).toBeLessThanOrEqual(1);
    expect(activityScore({ stars: 0, sizeKb: 0, pushedAt: daysAgo(5000) }, NOW)).toBeGreaterThanOrEqual(0);
  });

  it('increases with stars and with recency', () => {
    const base = { stars: 0, sizeKb: 100, pushedAt: daysAgo(365) };
    expect(activityScore({ ...base, stars: 3 }, NOW)).toBeGreaterThan(activityScore(base, NOW));
    expect(activityScore({ ...base, pushedAt: daysAgo(30) }, NOW)).toBeGreaterThan(activityScore(base, NOW));
  });

  it('weights recency 0.5, stars 0.3, size 0.2', () => {
    expect(activityScore({ stars: 0, sizeKb: 0, pushedAt: daysAgo(0) }, NOW)).toBeCloseTo(0.5, 5);
    expect(activityScore({ stars: 15, sizeKb: 0, pushedAt: daysAgo(730) }, NOW)).toBeCloseTo(0.3, 5);
    expect(activityScore({ stars: 0, sizeKb: 9999, pushedAt: daysAgo(730) }, NOW)).toBeCloseTo(0.2, 5);
  });
});

describe('radiusFor', () => {
  it('maps 0..1 to 0.6..1.6', () => {
    expect(radiusFor(0)).toBe(0.6);
    expect(radiusFor(1)).toBe(1.6);
    expect(radiusFor(0.5)).toBeCloseTo(1.1, 10);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test activity`
Expected: FAIL — cannot resolve `./activity`.

- [ ] **Step 4: Implement activity.ts**

`src/lib/activity.ts`:
```ts
export interface ActivityInput {
  stars: number;
  sizeKb: number;
  pushedAt: string;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** 0..1 blend of recency (0.5), stars (0.3) and size (0.2). See spec §7.2. */
export function activityScore(input: ActivityInput, now: Date = new Date()): number {
  const days = (now.getTime() - new Date(input.pushedAt).getTime()) / 86_400_000;
  const recency = clamp01(1 - days / 730);
  const stars = clamp01(Math.log2(input.stars + 1) / 4);
  const size = clamp01(Math.log10(input.sizeKb + 1) / 4);
  return clamp01(0.5 * recency + 0.3 * stars + 0.2 * size);
}

export const RADIUS_MIN = 0.6;
export const RADIUS_RANGE = 1.0;

export function radiusFor(activity: number): number {
  return RADIUS_MIN + clamp01(activity) * RADIUS_RANGE;
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/activity.ts src/lib/activity.test.ts
git commit -m "feat: project types and activity score

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Project overrides (`content/projects.yml`)

**Files:**
- Create: `src/lib/overrides.ts`, `content/projects.yml`
- Test: `src/lib/overrides.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface ProjectOverride { title?: string; blurb?: string; hidden?: boolean; featured?: boolean; image?: string; homepage?: string }
  type OverrideMap = Record<string, ProjectOverride>
  parseOverrides(yamlText: string): OverrideMap
  isHidden(name: string, overrides: OverrideMap): boolean
  applyOverride(project: Project, override: ProjectOverride | undefined): Project
  ```

- [ ] **Step 1: Write the failing test**

`src/lib/overrides.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Project } from './types';
import { applyOverride, isHidden, parseOverrides } from './overrides';

const base: Project = {
  id: 'pathfinding',
  title: 'pathfinding',
  blurb: null,
  url: 'https://github.com/raphaelvermeil/pathfinding',
  homepage: null,
  language: 'Java',
  languages: { Java: 100 },
  stars: 0,
  sizeKb: 10,
  pushedAt: '2025-11-21T00:00:00Z',
  topics: [],
  readmeExcerpt: null,
  featured: false,
  image: null,
  activity: 0.3,
};

describe('parseOverrides', () => {
  it('parses a map keyed by repo name', () => {
    const map = parseOverrides('pathfinding:\n  title: Pathfinding\n  featured: true\nfoo:\n  hidden: true\n');
    expect(map.pathfinding).toEqual({ title: 'Pathfinding', featured: true });
    expect(map.foo).toEqual({ hidden: true });
  });

  it('returns an empty map for empty or comment-only input', () => {
    expect(parseOverrides('')).toEqual({});
    expect(parseOverrides('# nothing here\n')).toEqual({});
  });

  it('rejects unknown fields', () => {
    expect(() => parseOverrides('x:\n  colour: red\n')).toThrow(/unknown field "colour"/);
  });
});

describe('isHidden', () => {
  it('is true only when hidden: true', () => {
    expect(isHidden('a', { a: { hidden: true } })).toBe(true);
    expect(isHidden('a', { a: { hidden: false } })).toBe(false);
    expect(isHidden('a', {})).toBe(false);
  });
});

describe('applyOverride', () => {
  it('returns the project unchanged when there is no override', () => {
    expect(applyOverride(base, undefined)).toEqual(base);
  });

  it('replaces title, blurb, homepage, image and featured', () => {
    const out = applyOverride(base, {
      title: 'Pathfinding',
      blurb: 'A* on a grid',
      homepage: 'https://example.com',
      image: '/img/pf.png',
      featured: true,
    });
    expect(out).toMatchObject({
      title: 'Pathfinding',
      blurb: 'A* on a grid',
      homepage: 'https://example.com',
      image: '/img/pf.png',
      featured: true,
    });
    expect(out.id).toBe('pathfinding');
  });

  it('keeps GitHub values for fields not overridden', () => {
    const out = applyOverride({ ...base, blurb: 'from github', homepage: 'https://gh.example' }, { title: 'X' });
    expect(out.blurb).toBe('from github');
    expect(out.homepage).toBe('https://gh.example');
    expect(out.featured).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test overrides`
Expected: FAIL — cannot resolve `./overrides`.

- [ ] **Step 3: Implement overrides.ts**

`src/lib/overrides.ts`:
```ts
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
  const doc = load(yamlText);
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
```

- [ ] **Step 4: Write the initial content/projects.yml**

`content/projects.yml`:
```yaml
# Per-repo overrides, keyed by repository name.
# Fields: title, blurb, hidden, featured, image (path under public/), homepage.

ECSEGAMES:
  title: ECSE Games
  featured: true

github-slideshow:
  hidden: true

neetcode-submissions:
  hidden: true
```

- [ ] **Step 5: Run tests**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/overrides.ts src/lib/overrides.test.ts content/projects.yml
git commit -m "feat: project override parsing and merging

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Site content parsing (`site.yml`, `skills.yml`, `about.md`)

**Files:**
- Create: `src/lib/content.ts`, `src/lib/siteContent.ts`, `content/site.yml`, `content/skills.yml`, `content/about.md`
- Test: `src/lib/content.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface SiteConfig { name: string; tagline: string; github: string; email: string; linkedin: string | null; resume: string | null }
  interface SkillGroup { group: string; items: string[] }
  parseSite(yamlText: string): SiteConfig
  parseSkills(yamlText: string): SkillGroup[]
  // siteContent.ts
  export const site: SiteConfig; export const skills: SkillGroup[]; export const aboutMarkdown: string;
  ```

- [ ] **Step 1: Write the failing test**

`src/lib/content.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseSite, parseSkills } from './content';

describe('parseSite', () => {
  it('parses required and optional fields', () => {
    const site = parseSite('name: R\ntagline: T\ngithub: rv\nemail: a@b.c\nlinkedin: https://l\nresume: /r.pdf\n');
    expect(site).toEqual({ name: 'R', tagline: 'T', github: 'rv', email: 'a@b.c', linkedin: 'https://l', resume: '/r.pdf' });
  });

  it('defaults optional fields to null', () => {
    const site = parseSite('name: R\ntagline: T\ngithub: rv\nemail: a@b.c\n');
    expect(site.linkedin).toBeNull();
    expect(site.resume).toBeNull();
  });

  it('throws when a required field is missing', () => {
    expect(() => parseSite('name: R\n')).toThrow(/site.yml is missing "tagline"/);
  });
});

describe('parseSkills', () => {
  it('parses groups of items', () => {
    expect(parseSkills('- group: Languages\n  items: [TypeScript, Java]\n')).toEqual([
      { group: 'Languages', items: ['TypeScript', 'Java'] },
    ]);
  });

  it('returns [] for empty input', () => {
    expect(parseSkills('')).toEqual([]);
  });

  it('throws on a malformed group', () => {
    expect(() => parseSkills('- items: [x]\n')).toThrow(/skills.yml entry 0 needs "group" and "items"/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test content`
Expected: FAIL — cannot resolve `./content`.

- [ ] **Step 3: Implement content.ts**

`src/lib/content.ts`:
```ts
import { load } from 'js-yaml';

export interface SiteConfig {
  name: string;
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
  const doc = (load(yamlText) ?? {}) as Record<string, unknown>;
  return {
    name: requireString(doc, 'name', 'site.yml'),
    tagline: requireString(doc, 'tagline', 'site.yml'),
    github: requireString(doc, 'github', 'site.yml'),
    email: requireString(doc, 'email', 'site.yml'),
    linkedin: optionalString(doc, 'linkedin'),
    resume: optionalString(doc, 'resume'),
  };
}

export function parseSkills(yamlText: string): SkillGroup[] {
  const doc = load(yamlText);
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
```

- [ ] **Step 4: Write the content files and siteContent.ts**

`content/site.yml`:
```yaml
name: Raphael Vermeil
tagline: Engineering student · games, robots and neural nets
github: raphaelvermeil
email: raphael.vermeil@gmail.com
# linkedin: https://www.linkedin.com/in/your-handle
# resume: /resume.pdf
```

`content/skills.yml`:
```yaml
- group: Languages
  items: [TypeScript, JavaScript, Java, Python, C]
- group: Web
  items: [React, Node.js, Express, Socket.io, Three.js]
- group: Data & ML
  items: [NumPy, pandas, PyTorch, Jupyter]
- group: Tools
  items: [Git, Linux, Docker, VS Code]
```

`content/about.md`:
```markdown
I'm Raphael, an engineering student who likes building things that move — on screen and off it.

Recent projects range from browser games and a real-time MERN chat app to pathfinding visualisers, a neural network written from scratch, and robot control code for ECSE 211. I'm most at home in TypeScript, Java and Python.

Every gear above is one of my public repositories. Drag to orbit, click a gear to read more.
```

`src/lib/siteContent.ts`:
```ts
import siteRaw from '../../content/site.yml?raw';
import skillsRaw from '../../content/skills.yml?raw';
import aboutRaw from '../../content/about.md?raw';
import { parseSite, parseSkills } from './content';

export const site = parseSite(siteRaw);
export const skills = parseSkills(skillsRaw);
export const aboutMarkdown = aboutRaw;
```

- [ ] **Step 5: Run tests and type-check**

Run: `pnpm test && npx tsc --noEmit`
Expected: all pass; no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/content.ts src/lib/content.test.ts src/lib/siteContent.ts content/
git commit -m "feat: site content parsing and initial content files

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: GitHub fetch script and generated data

**Files:**
- Create: `scripts/fetch-github.ts`, `src/lib/data.ts`, `src/data/projects.json`, `src/data/languages.json`, `src/data/meta.json`
- Test: `scripts/fetch-github.test.ts`

**Interfaces:**
- Consumes: `activityScore`, `parseOverrides`, `isHidden`, `applyOverride`, `parseSite`, `Project`, `Meta`.
- Produces:
  ```ts
  type Fetcher = (url: string) => Promise<{ status: number; json: () => Promise<unknown> }>
  interface FetchDeps { fetcher: Fetcher; readText(path: string): Promise<string>; writeText(path: string, text: string): Promise<void>; exists(path: string): boolean; log(msg: string): void; now(): Date }
  OUTPUT = { projects: 'src/data/projects.json', languages: 'src/data/languages.json', meta: 'src/data/meta.json' }
  fetchAll(user: string, overrides: OverrideMap, deps: FetchDeps): Promise<{ projects: Project[]; languages: Record<string, number>; meta: Meta }>
  run(deps: FetchDeps): Promise<number>   // process exit code
  // data.ts
  export const projects: Project[]; export const languageBytes: Record<string, number>; export const meta: Meta;
  ```

- [ ] **Step 1: Write the failing test**

`scripts/fetch-github.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test fetch-github`
Expected: FAIL — cannot resolve `./fetch-github`.

- [ ] **Step 3: Implement scripts/fetch-github.ts**

```ts
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
      activity: activityScore({ stars: r.stargazers_count, sizeKb: r.size, pushedAt: r.pushed_at }, now),
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
  run(realDeps).then((code) => process.exit(code));
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 5: Run the script for real and inspect output**

Run: `pnpm sync && ls -la src/data && node -e "const p=require('./src/data/projects.json');console.log(p.length, p.slice(0,3).map(x=>[x.id,x.language,x.activity.toFixed(2)]))"`
Expected: `[sync] fetched 22 repos, keeping 18` (approx — forks + the two hidden ones removed), three JSON files, ~18 projects with activity between 0 and 1. If the anonymous rate limit is hit (403), set `GITHUB_TOKEN` to a personal token and re-run.

- [ ] **Step 6: Write data.ts**

`src/lib/data.ts`:
```ts
import projectsJson from '../data/projects.json';
import languagesJson from '../data/languages.json';
import metaJson from '../data/meta.json';
import type { Meta, Project } from './types';

export const projects = projectsJson as Project[];
export const languageBytes = languagesJson as Record<string, number>;
export const meta = metaJson as Meta;

export const projectById: Record<string, Project> = Object.fromEntries(projects.map((p) => [p.id, p]));
```

- [ ] **Step 7: Full build**

Run: `pnpm build`
Expected: `prebuild` runs the sync (or warns and keeps data), tsc passes, `dist/` produced.

- [ ] **Step 8: Commit**

```bash
git add scripts/ src/lib/data.ts src/data/
git commit -m "feat: GitHub fetch script with generated project data

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Procedural gear geometry

**Files:**
- Create: `src/scene/gearGeometry.ts`
- Test: `src/scene/gearGeometry.test.ts`

**Interfaces:**
- Produces:
  ```ts
  TEETH_PER_UNIT = 14; TEETH_MIN = 8; TEETH_MAX = 28; GEAR_THICKNESS = 0.12
  teethFor(radius: number): number
  gearOutline(radius: number, teeth: number): Vector2[]   // 4 points per tooth, counter-clockwise
  createGearGeometry(radius: number, teeth: number, thickness?: number): ExtrudeGeometry  // centred on origin, axis = +Z
  ```

- [ ] **Step 1: Write the failing test**

`src/scene/gearGeometry.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { TEETH_MAX, TEETH_MIN, createGearGeometry, gearOutline, teethFor } from './gearGeometry';

describe('teethFor', () => {
  it('scales with radius at 14 teeth per unit', () => {
    expect(teethFor(1.0)).toBe(14);
    expect(teethFor(1.6)).toBe(22);
  });

  it('clamps to [8, 28]', () => {
    expect(teethFor(0.1)).toBe(TEETH_MIN);
    expect(teethFor(0.6)).toBe(8);
    expect(teethFor(5)).toBe(TEETH_MAX);
  });
});

describe('gearOutline', () => {
  it('emits four points per tooth', () => {
    expect(gearOutline(1, 12)).toHaveLength(48);
  });

  it('spans from the root radius to the outer radius', () => {
    const rs = gearOutline(1, 12).map((p) => p.length());
    expect(Math.max(...rs)).toBeCloseTo(1, 6);
    expect(Math.min(...rs)).toBeCloseTo(0.82, 6);
  });
});

describe('createGearGeometry', () => {
  it('has a bounding sphere about the size of the radius, centred on the origin', () => {
    const g = createGearGeometry(1.2, 16);
    g.computeBoundingSphere();
    expect(g.boundingSphere!.radius).toBeGreaterThan(1.15);
    expect(g.boundingSphere!.radius).toBeLessThan(1.3);
    expect(Math.abs(g.boundingSphere!.center.z)).toBeLessThan(0.01);
  });

  it('is symmetric in z (centred extrusion)', () => {
    const g = createGearGeometry(1, 10, 0.2);
    g.computeBoundingBox();
    expect(g.boundingBox!.min.z).toBeCloseTo(-0.1, 6);
    expect(g.boundingBox!.max.z).toBeCloseTo(0.1, 6);
  });

  it('has a bore hole (no vertex at the exact centre)', () => {
    const g = createGearGeometry(1, 10);
    const pos = g.getAttribute('position');
    let minR = Infinity;
    for (let i = 0; i < pos.count; i++) minR = Math.min(minR, Math.hypot(pos.getX(i), pos.getY(i)));
    expect(minR).toBeGreaterThan(0.15);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test gearGeometry`
Expected: FAIL — cannot resolve `./gearGeometry`.

- [ ] **Step 3: Implement gearGeometry.ts**

`src/scene/gearGeometry.ts`:
```ts
import { ExtrudeGeometry, Path, Shape, Vector2 } from 'three';

export const TEETH_PER_UNIT = 14;
export const TEETH_MIN = 8;
export const TEETH_MAX = 28;
export const GEAR_THICKNESS = 0.12;
const ROOT_RATIO = 0.82;
const BORE_RATIO = 0.18;

export function teethFor(radius: number): number {
  return Math.min(TEETH_MAX, Math.max(TEETH_MIN, Math.round(radius * TEETH_PER_UNIT)));
}

/** Spur-gear outline: per tooth → root, root, tip, tip (flanks slope between). */
export function gearOutline(radius: number, teeth: number): Vector2[] {
  const root = radius * ROOT_RATIO;
  const step = (Math.PI * 2) / teeth;
  const pts: Vector2[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    pts.push(polar(root, a));
    pts.push(polar(root, a + step * 0.4));
    pts.push(polar(radius, a + step * 0.5));
    pts.push(polar(radius, a + step * 0.9));
  }
  return pts;
}

function polar(r: number, angle: number): Vector2 {
  return new Vector2(Math.cos(angle) * r, Math.sin(angle) * r);
}

export function createGearGeometry(radius: number, teeth: number, thickness = GEAR_THICKNESS): ExtrudeGeometry {
  const shape = new Shape(gearOutline(radius, teeth));
  const bore = new Path();
  bore.absarc(0, 0, radius * BORE_RATIO, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  const geometry = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 4 });
  geometry.translate(0, 0, -thickness / 2);
  return geometry;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/scene/gearGeometry.ts src/scene/gearGeometry.test.ts
git commit -m "feat: procedural spur gear geometry

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Deterministic constellation layout

**Files:**
- Create: `src/scene/layout.ts`
- Test: `src/scene/layout.test.ts`

**Interfaces:**
- Consumes: `teethFor`, `languageLabel`.
- Produces:
  ```ts
  interface LayoutItem { id: string; language: string | null; radius: number }
  interface GearPlacement { id: string; language: string; position: [number, number, number]; quaternion: [number, number, number, number]; radius: number; teeth: number }
  interface Sector { language: string; start: number; width: number }
  SHELL_MIN = 6; SHELL_MAX = 8; GAP = 0.4
  hashString(s: string): number; mulberry32(seed: number): () => number
  assignSectors(items: LayoutItem[]): Sector[]
  layoutGears(items: LayoutItem[]): GearPlacement[]   // ordered by sector, then id
  ```

- [ ] **Step 1: Write the failing test**

`src/scene/layout.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { GAP, SHELL_MAX, SHELL_MIN, assignSectors, layoutGears, mulberry32, type LayoutItem } from './layout';

const items: LayoutItem[] = [
  ...['j1', 'j2', 'j3', 'j4', 'j5', 'j6', 'j7'].map((id) => ({ id, language: 'Java', radius: 1.0 })),
  ...['t1', 't2', 't3', 't4', 't5'].map((id) => ({ id, language: 'TypeScript', radius: 1.3 })),
  ...['p1', 'p2', 'p3', 'p4'].map((id) => ({ id, language: 'Python', radius: 0.8 })),
  { id: 'js1', language: 'JavaScript', radius: 1.6 },
  { id: 'js2', language: 'JavaScript', radius: 0.6 },
  { id: 'h1', language: 'HTML', radius: 0.9 },
  { id: 'r1', language: 'Ruby', radius: 0.6 },
  { id: 'n1', language: null, radius: 0.7 },
];

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('mulberry32', () => {
  it('is deterministic and in [0,1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('assignSectors', () => {
  it('orders languages by count desc then name, and sums to 2π', () => {
    const sectors = assignSectors(items);
    expect(sectors.map((s) => s.language)).toEqual(['Java', 'TypeScript', 'Python', 'JavaScript', 'HTML', 'Other', 'Ruby']);
    const total = sectors.reduce((s, x) => s + x.width, 0);
    expect(total).toBeCloseTo(Math.PI * 2, 6);
    for (let i = 1; i < sectors.length; i++) expect(sectors[i].start).toBeCloseTo(sectors[i - 1].start + sectors[i - 1].width, 6);
  });

  it('gives single-repo languages a minimum width', () => {
    const sectors = assignSectors(items);
    const ruby = sectors.find((s) => s.language === 'Ruby')!;
    expect(ruby.width).toBeGreaterThan(0.35);
  });
});

describe('layoutGears', () => {
  const out = layoutGears(items);

  it('places every item once, keeping radius and computing teeth', () => {
    expect(out.map((p) => p.id).sort()).toEqual(items.map((i) => i.id).sort());
    const js1 = out.find((p) => p.id === 'js1')!;
    expect(js1.radius).toBe(1.6);
    expect(js1.teeth).toBe(22);
    expect(out.find((p) => p.id === 'n1')!.language).toBe('Other');
  });

  it('is deterministic', () => {
    expect(layoutGears(items)).toEqual(out);
    expect(layoutGears([...items].reverse())).toEqual(out);
  });

  it('keeps gears roughly on the shell', () => {
    for (const p of out) {
      const r = Math.hypot(...p.position);
      expect(r).toBeGreaterThan(SHELL_MIN - 1.5);
      expect(r).toBeLessThan(SHELL_MAX + 1.5);
    }
  });

  it('leaves at least rA + rB + GAP between every pair', () => {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const need = out[i].radius + out[j].radius + GAP;
        expect(dist(out[i].position, out[j].position)).toBeGreaterThanOrEqual(need - 1e-6);
      }
    }
  });

  it('emits unit quaternions', () => {
    for (const p of out) expect(Math.hypot(...p.quaternion)).toBeCloseTo(1, 6);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test layout`
Expected: FAIL — cannot resolve `./layout`.

- [ ] **Step 3: Implement layout.ts**

`src/scene/layout.ts`:
```ts
import { Quaternion, Vector3 } from 'three';
import { languageLabel } from '../lib/palette';
import { teethFor } from './gearGeometry';

export interface LayoutItem {
  id: string;
  language: string | null;
  radius: number;
}

export interface GearPlacement {
  id: string;
  language: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  radius: number;
  teeth: number;
}

export interface Sector {
  language: string;
  start: number;
  width: number;
}

export const SHELL_MIN = 6;
export const SHELL_MAX = 8;
export const GAP = 0.4;
const MIN_SECTOR = 0.5;
const LATITUDE_LIMIT = Math.PI / 3;
const RELAX_ITERATIONS = 80;
const GOLDEN = 0.618033988749895;

export function hashString(s: string): number {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function groupByLanguage(items: LayoutItem[]): Map<string, LayoutItem[]> {
  const groups = new Map<string, LayoutItem[]>();
  for (const item of items) {
    const lang = languageLabel(item.language);
    if (!groups.has(lang)) groups.set(lang, []);
    groups.get(lang)!.push(item);
  }
  for (const list of groups.values()) list.sort((a, b) => a.id.localeCompare(b.id));
  return groups;
}

export function assignSectors(items: LayoutItem[]): Sector[] {
  const groups = groupByLanguage(items);
  const langs = [...groups.keys()].sort((a, b) => groups.get(b)!.length - groups.get(a)!.length || a.localeCompare(b));
  const raw = langs.map((l) => Math.max(MIN_SECTOR, (groups.get(l)!.length / items.length) * Math.PI * 2));
  const scale = (Math.PI * 2) / raw.reduce((s, w) => s + w, 0);
  let start = 0;
  return langs.map((language, i) => {
    const width = raw[i] * scale;
    const sector = { language, start, width };
    start += width;
    return sector;
  });
}

function relax(positions: Vector3[], radii: number[], rand: () => number): void {
  const axis = new Vector3();
  for (let iter = 0; iter < RELAX_ITERATIONS; iter++) {
    let moved = false;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const need = radii[i] + radii[j] + GAP;
        axis.subVectors(positions[j], positions[i]);
        let d = axis.length();
        if (d >= need) continue;
        if (d < 1e-6) {
          axis.set(rand() - 0.5, rand() - 0.5, rand() - 0.5);
          d = axis.length();
        }
        axis.multiplyScalar(((need - d) / 2 + 1e-4) / d);
        positions[i].sub(axis);
        positions[j].add(axis);
        moved = true;
      }
    }
    if (!moved) return;
  }
}

export function layoutGears(items: LayoutItem[]): GearPlacement[] {
  const seed = hashString([...items.map((i) => i.id)].sort().join('|'));
  const rand = mulberry32(seed);
  const groups = groupByLanguage(items);
  const sectors = assignSectors(items);

  const ordered: LayoutItem[] = [];
  const positions: Vector3[] = [];
  const radii: number[] = [];

  for (const sector of sectors) {
    const list = groups.get(sector.language)!;
    list.forEach((item, i) => {
      const theta = sector.start + ((i + 0.5) / list.length) * sector.width + (rand() - 0.5) * 0.3;
      const lat = (-1 + 2 * ((i * GOLDEN + rand() * 0.1) % 1)) * LATITUDE_LIMIT;
      const r = SHELL_MIN + rand() * (SHELL_MAX - SHELL_MIN);
      ordered.push(item);
      positions.push(new Vector3(r * Math.cos(lat) * Math.cos(theta), r * Math.sin(lat), r * Math.cos(lat) * Math.sin(theta)));
      radii.push(item.radius);
    });
  }

  relax(positions, radii, rand);

  const up = new Vector3(0, 0, 1);
  return ordered.map((item, i) => {
    const dir = positions[i].clone().normalize();
    dir.x += (rand() - 0.5) * 0.4;
    dir.y += (rand() - 0.5) * 0.4;
    dir.z += (rand() - 0.5) * 0.4;
    dir.normalize();
    const q = new Quaternion().setFromUnitVectors(up, dir);
    return {
      id: item.id,
      language: languageLabel(item.language),
      position: [positions[i].x, positions[i].y, positions[i].z],
      quaternion: [q.x, q.y, q.z, q.w],
      radius: item.radius,
      teeth: teethFor(item.radius),
    };
  });
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: all pass. If the gap test fails, raise `RELAX_ITERATIONS` to 200 and re-run. If the shell test fails, relaxation pushed gears further than expected: lower `LATITUDE_LIMIT` to `Math.PI / 4` (spreads gears more evenly) before loosening the tolerance.

- [ ] **Step 5: Commit**

```bash
git add src/scene/layout.ts src/scene/layout.test.ts
git commit -m "feat: deterministic gear constellation layout

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Shafts, belts and spin directions

**Files:**
- Create: `src/scene/links.ts`, `src/scene/machine.ts`
- Test: `src/scene/links.test.ts`

**Interfaces:**
- Consumes: `GearPlacement`, `layoutGears`, `projects`, `radiusFor`.
- Produces:
  ```ts
  interface Shaft { a: string; b: string; language: string }
  interface Belt { a: string; b: string; mid: [number, number, number] }
  interface LinkGraph { shafts: Shaft[]; belts: Belt[]; spinDir: Record<string, 1 | -1> }
  buildLinks(placements: GearPlacement[]): LinkGraph
  // machine.ts
  export const placements: GearPlacement[]; export const placementById: Record<string, GearPlacement>; export const links: LinkGraph;
  ```

- [ ] **Step 1: Write the failing test**

`src/scene/links.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { buildLinks } from './links';
import type { GearPlacement } from './layout';

const P = (id: string, language: string, x: number, y: number, z: number): GearPlacement => ({
  id,
  language,
  position: [x, y, z],
  quaternion: [0, 0, 0, 1],
  radius: 1,
  teeth: 14,
});

const placements = [
  P('a1', 'Java', 0, 0, 7),
  P('a2', 'Java', 3, 0, 7),
  P('a3', 'Java', 6, 0, 7),
  P('a4', 'Java', 3, 3, 7),
  P('b1', 'Python', 0, 0, -7),
  P('b2', 'Python', 3, 0, -7),
  P('c1', 'Ruby', 7, 0, 0),
];

function connected(ids: string[], edges: { a: string; b: string }[]): boolean {
  const parent = new Map(ids.map((i) => [i, i]));
  const find = (x: string): string => (parent.get(x) === x ? x : find(parent.get(x)!));
  for (const e of edges) parent.set(find(e.a), find(e.b));
  return new Set(ids.map(find)).size === 1;
}

describe('buildLinks', () => {
  const g = buildLinks(placements);

  it('connects every language cluster with shafts (a spanning tree)', () => {
    const java = g.shafts.filter((s) => s.language === 'Java');
    expect(java).toHaveLength(3);
    expect(connected(['a1', 'a2', 'a3', 'a4'], java)).toBe(true);
    expect(g.shafts.filter((s) => s.language === 'Python')).toHaveLength(1);
    expect(g.shafts.filter((s) => s.language === 'Ruby')).toHaveLength(0);
  });

  it('never links across languages with a shaft', () => {
    const lang = Object.fromEntries(placements.map((p) => [p.id, p.language]));
    for (const s of g.shafts) expect(lang[s.a]).toBe(lang[s.b]);
  });

  it('adds one belt between each consecutive cluster, through the closest pair', () => {
    expect(g.belts).toHaveLength(2);
    expect(g.belts[0]).toMatchObject({ a: 'a1', b: 'b1' });
    expect(g.belts[1]).toMatchObject({ a: 'b2', b: 'c1' });
  });

  it('pushes belt midpoints outward from the origin', () => {
    const [ax, ay, az] = placements[0].position;
    const [bx, by, bz] = placements[4].position;
    const mid = g.belts[0].mid;
    const plain = Math.hypot((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    expect(Math.hypot(...mid)).toBeGreaterThanOrEqual(plain);
  });

  it('alternates spin direction across every shaft', () => {
    for (const s of g.shafts) expect(g.spinDir[s.a]).toBe(-g.spinDir[s.b] as 1 | -1);
    for (const p of placements) expect([1, -1]).toContain(g.spinDir[p.id]);
  });

  it('handles an empty input', () => {
    expect(buildLinks([])).toEqual({ shafts: [], belts: [], spinDir: {} });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test links`
Expected: FAIL — cannot resolve `./links`.

- [ ] **Step 3: Implement links.ts**

`src/scene/links.ts`:
```ts
import type { GearPlacement } from './layout';

export interface Shaft {
  a: string;
  b: string;
  language: string;
}

export interface Belt {
  a: string;
  b: string;
  mid: [number, number, number];
}

export interface LinkGraph {
  shafts: Shaft[];
  belts: Belt[];
  spinDir: Record<string, 1 | -1>;
}

const BELT_BULGE = 1.25;

function dist(a: GearPlacement, b: GearPlacement): number {
  return Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1], a.position[2] - b.position[2]);
}

/** Prim's algorithm over a small cluster. */
function spanningTree(cluster: GearPlacement[]): Shaft[] {
  if (cluster.length < 2) return [];
  const inTree = new Set<number>([0]);
  const edges: Shaft[] = [];
  while (inTree.size < cluster.length) {
    let best: { i: number; j: number; d: number } | null = null;
    for (const i of inTree) {
      for (let j = 0; j < cluster.length; j++) {
        if (inTree.has(j)) continue;
        const d = dist(cluster[i], cluster[j]);
        if (!best || d < best.d) best = { i, j, d };
      }
    }
    inTree.add(best!.j);
    edges.push({ a: cluster[best!.i].id, b: cluster[best!.j].id, language: cluster[best!.i].language });
  }
  return edges;
}

function closestPair(x: GearPlacement[], y: GearPlacement[]): [GearPlacement, GearPlacement] {
  let best: [GearPlacement, GearPlacement] = [x[0], y[0]];
  let bestD = Infinity;
  for (const a of x) {
    for (const b of y) {
      const d = dist(a, b);
      if (d < bestD) {
        bestD = d;
        best = [a, b];
      }
    }
  }
  return best;
}

function assignSpin(cluster: GearPlacement[], shafts: Shaft[], out: Record<string, 1 | -1>): void {
  const adj = new Map<string, string[]>();
  for (const p of cluster) adj.set(p.id, []);
  for (const s of shafts) {
    adj.get(s.a)!.push(s.b);
    adj.get(s.b)!.push(s.a);
  }
  for (const p of cluster) {
    if (p.id in out) continue;
    out[p.id] = 1;
    const queue = [p.id];
    while (queue.length) {
      const id = queue.shift()!;
      for (const n of adj.get(id)!) {
        if (n in out) continue;
        out[n] = out[id] === 1 ? -1 : 1;
        queue.push(n);
      }
    }
  }
}

export function buildLinks(placements: GearPlacement[]): LinkGraph {
  const clusters: GearPlacement[][] = [];
  const byLanguage = new Map<string, GearPlacement[]>();
  for (const p of placements) {
    if (!byLanguage.has(p.language)) {
      const list: GearPlacement[] = [];
      byLanguage.set(p.language, list);
      clusters.push(list);
    }
    byLanguage.get(p.language)!.push(p);
  }

  const shafts: Shaft[] = [];
  const spinDir: Record<string, 1 | -1> = {};
  for (const cluster of clusters) {
    const tree = spanningTree(cluster);
    shafts.push(...tree);
    assignSpin(cluster, tree, spinDir);
  }

  const belts: Belt[] = [];
  for (let i = 1; i < clusters.length; i++) {
    const [a, b] = closestPair(clusters[i - 1], clusters[i]);
    const mid: [number, number, number] = [
      ((a.position[0] + b.position[0]) / 2) * BELT_BULGE,
      ((a.position[1] + b.position[1]) / 2) * BELT_BULGE,
      ((a.position[2] + b.position[2]) / 2) * BELT_BULGE,
    ];
    belts.push({ a: a.id, b: b.id, mid });
  }

  return { shafts, belts, spinDir };
}
```

- [ ] **Step 4: Write machine.ts**

`src/scene/machine.ts`:
```ts
import { radiusFor } from '../lib/activity';
import { projects } from '../lib/data';
import { buildLinks } from './links';
import { layoutGears, type GearPlacement } from './layout';

export const placements: GearPlacement[] = layoutGears(
  projects.map((p) => ({ id: p.id, language: p.language, radius: radiusFor(p.activity) })),
);

export const placementById: Record<string, GearPlacement> = Object.fromEntries(placements.map((p) => [p.id, p]));

export const links = buildLinks(placements);
```

- [ ] **Step 5: Run tests and type-check**

Run: `pnpm test && npx tsc --noEmit`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/scene/links.ts src/scene/links.test.ts src/scene/machine.ts
git commit -m "feat: shafts, belts and spin directions between gears

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Interaction store and hooks

**Files:**
- Create: `src/lib/store.ts`, `src/lib/hooks.ts`, `src/lib/webgl.ts`
- Test: `src/lib/store.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface MachineState { hovered: string | null; selected: string | null; filter: string | null; hasInteracted: boolean;
    setHovered(id: string | null): void; setSelected(id: string | null): void; toggleFilter(language: string): void; markInteracted(): void }
  useStore: zustand hook (also useStore.getState())
  useMediaQuery(query: string): boolean; useReducedMotion(): boolean
  hasWebGL(): boolean
  ```

- [ ] **Step 1: Write the failing test**

`src/lib/store.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './store';

describe('store', () => {
  beforeEach(() => useStore.setState({ hovered: null, selected: null, filter: null, hasInteracted: false }));

  it('sets hovered and selected', () => {
    useStore.getState().setHovered('a');
    useStore.getState().setSelected('b');
    expect(useStore.getState()).toMatchObject({ hovered: 'a', selected: 'b' });
  });

  it('selecting marks the session as interacted', () => {
    useStore.getState().setSelected('a');
    expect(useStore.getState().hasInteracted).toBe(true);
  });

  it('toggleFilter sets, replaces and clears the language filter', () => {
    const s = useStore.getState();
    s.toggleFilter('Java');
    expect(useStore.getState().filter).toBe('Java');
    s.toggleFilter('Python');
    expect(useStore.getState().filter).toBe('Python');
    s.toggleFilter('Python');
    expect(useStore.getState().filter).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test store`
Expected: FAIL — cannot resolve `./store`.

- [ ] **Step 3: Implement store.ts, hooks.ts, webgl.ts**

`src/lib/store.ts`:
```ts
import { create } from 'zustand';

export interface MachineState {
  hovered: string | null;
  selected: string | null;
  filter: string | null;
  hasInteracted: boolean;
  setHovered(id: string | null): void;
  setSelected(id: string | null): void;
  toggleFilter(language: string): void;
  markInteracted(): void;
}

export const useStore = create<MachineState>((set) => ({
  hovered: null,
  selected: null,
  filter: null,
  hasInteracted: false,
  setHovered: (hovered) => set({ hovered }),
  setSelected: (selected) => set((s) => ({ selected, hasInteracted: s.hasInteracted || selected !== null })),
  toggleFilter: (language) => set((s) => ({ filter: s.filter === language ? null : language })),
  markInteracted: () => set({ hasInteracted: true }),
}));
```

`src/lib/hooks.ts`:
```ts
import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia(query).matches));
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
```

`src/lib/webgl.ts`:
```ts
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests and type-check**

Run: `pnpm test && npx tsc --noEmit`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/store.ts src/lib/store.test.ts src/lib/hooks.ts src/lib/webgl.ts
git commit -m "feat: interaction store, media hooks, WebGL check

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: The 3D scene

**Files:**
- Create: `src/scene/Gear.tsx`, `src/scene/Links.tsx`, `src/scene/GridBackdrop.tsx`, `src/scene/Dust.tsx`, `src/scene/CameraRig.tsx`, `src/scene/Effects.tsx`, `src/scene/Machine.tsx`
- Modify: `src/App.tsx`, `src/styles/global.css` (append)

**Interfaces:**
- Consumes: `placements`, `placementById`, `links`, `projectById`, `useStore`, `useMediaQuery`, `useReducedMotion`, `languageColor`, `createGearGeometry`.
- Produces: `<Machine />` — a full-size `<Canvas>`; the parent must give it a sized container.

No unit tests — verified in the browser at the end of the task.

- [ ] **Step 1: Gear.tsx**

```tsx
import { Html, useCursor } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { Color, DoubleSide, EdgesGeometry, type Group, type LineBasicMaterial, type Mesh } from 'three';
import { useReducedMotion } from '../lib/hooks';
import { languageColor } from '../lib/palette';
import { useStore } from '../lib/store';
import type { Project } from '../lib/types';
import { createGearGeometry } from './gearGeometry';
import type { GearPlacement } from './layout';

const BASE_SPEED = 0.15;
const HOVER_MULT = 4;
const SELECT_MULT = 2;

interface Props {
  placement: GearPlacement;
  project: Project;
  spinDir: 1 | -1;
}

export function Gear({ placement, project, spinDir }: Props) {
  const { id, radius, teeth, position, quaternion } = placement;
  const geometry = useMemo(() => createGearGeometry(radius, teeth), [radius, teeth]);
  const edges = useMemo(() => new EdgesGeometry(geometry, 15), [geometry]);
  const baseColor = useMemo(() => new Color(languageColor(project.language)), [project.language]);

  const spinner = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const edgeMat = useRef<LineBasicMaterial>(null);
  const angle = useRef(0);
  const [localHover, setLocalHover] = useState(false);

  const hovered = useStore((s) => s.hovered === id);
  const selected = useStore((s) => s.selected === id);
  const filter = useStore((s) => s.filter);
  const setHovered = useStore((s) => s.setHovered);
  const setSelected = useStore((s) => s.setSelected);
  const reduced = useReducedMotion();

  const dimmed = filter !== null && filter !== placement.language;
  useCursor(localHover && !dimmed);

  useFrame((state, dt) => {
    const base = reduced ? BASE_SPEED * 0.25 : BASE_SPEED;
    const mult = hovered ? HOVER_MULT : selected ? SELECT_MULT : 1;
    const speed = dimmed ? 0 : base * mult;
    angle.current += dt * speed * spinDir;
    if (spinner.current) spinner.current.rotation.z = angle.current;
    if (edgeMat.current) {
      const target = dimmed ? 0.6 : hovered || selected ? 2.4 : 1.5;
      edgeMat.current.color.copy(baseColor).multiplyScalar(target);
    }
    if (ring.current) {
      const s = 1 + 0.03 * Math.sin(state.clock.elapsedTime * 2);
      ring.current.scale.set(s, s, 1);
    }
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (dimmed) return;
    setLocalHover(true);
    setHovered(id);
  };
  const onOut = () => {
    setLocalHover(false);
    if (useStore.getState().hovered === id) setHovered(null);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (dimmed) return;
    setSelected(selected ? null : id);
  };

  return (
    <group position={position} quaternion={quaternion}>
      <group ref={spinner}>
        <mesh geometry={geometry} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
          <meshBasicMaterial color={baseColor} transparent opacity={dimmed ? 0.02 : 0.08} depthWrite={false} side={DoubleSide} />
        </mesh>
        <lineSegments geometry={edges}>
          <lineBasicMaterial ref={edgeMat} transparent opacity={dimmed ? 0.15 : 1} toneMapped={false} />
        </lineSegments>
        {project.featured && (
          <mesh ref={ring}>
            <ringGeometry args={[radius * 1.12, radius * 1.15, 64]} />
            <meshBasicMaterial color="#5ee1ff" transparent opacity={dimmed ? 0.1 : 0.7} side={DoubleSide} toneMapped={false} />
          </mesh>
        )}
      </group>
      {(hovered || selected) && !dimmed && (
        <Html position={[0, radius + 0.35, 0]} center distanceFactor={12} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className="gear-label">
            <span className="gear-label__name">{project.title}</span>
            <span className="gear-label__lang">{placement.language}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
```

- [ ] **Step 2: Links.tsx**

```tsx
import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import { CatmullRomCurve3, Vector3 } from 'three';
import { languageColor } from '../lib/palette';
import { useStore } from '../lib/store';
import type { Belt, Shaft } from './links';
import { links, placementById } from './machine';

const ACCENT = '#5ee1ff';

function useLinkState(a: string, b: string) {
  const highlighted = useStore((s) => s.hovered === a || s.hovered === b || s.selected === a || s.selected === b);
  const filter = useStore((s) => s.filter);
  const dimmed = filter !== null && (placementById[a].language !== filter || placementById[b].language !== filter);
  return { highlighted, dimmed };
}

function ShaftLine({ shaft }: { shaft: Shaft }) {
  const { highlighted, dimmed } = useLinkState(shaft.a, shaft.b);
  const points = useMemo(() => [placementById[shaft.a].position, placementById[shaft.b].position], [shaft]);
  const color = languageColor(shaft.language === 'Other' ? null : shaft.language);
  return <Line points={points} color={color} lineWidth={highlighted ? 1.5 : 1} transparent opacity={dimmed ? 0.05 : highlighted ? 0.8 : 0.35} toneMapped={false} />;
}

function BeltTube({ belt }: { belt: Belt }) {
  const { highlighted, dimmed } = useLinkState(belt.a, belt.b);
  const curve = useMemo(
    () => new CatmullRomCurve3([new Vector3(...placementById[belt.a].position), new Vector3(...belt.mid), new Vector3(...placementById[belt.b].position)]),
    [belt],
  );
  return (
    <mesh>
      <tubeGeometry args={[curve, 32, 0.03, 6, false]} />
      <meshBasicMaterial color={ACCENT} transparent opacity={dimmed ? 0.04 : highlighted ? 0.8 : 0.25} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

export function Links() {
  return (
    <group>
      {links.shafts.map((s) => (
        <ShaftLine key={`${s.a}-${s.b}`} shaft={s} />
      ))}
      {links.belts.map((b) => (
        <BeltTube key={`${b.a}-${b.b}`} belt={b} />
      ))}
    </group>
  );
}
```

- [ ] **Step 3: GridBackdrop.tsx**

```tsx
import { useMemo } from 'react';
import { BackSide, Color, ShaderMaterial } from 'three';

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  varying vec2 vUv;
  float gridLine(float coord, float cells, float width) {
    float scaled = coord * cells;
    float f = abs(fract(scaled - 0.5) - 0.5) / fwidth(scaled);
    return 1.0 - min(f / width, 1.0);
  }
  void main() {
    float minor = max(gridLine(vUv.x, 96.0, 1.0), gridLine(vUv.y, 48.0, 1.0));
    float major = max(gridLine(vUv.x, 24.0, 1.2), gridLine(vUv.y, 12.0, 1.2));
    float alpha = minor * 0.025 + major * 0.05;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function GridBackdrop() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { uColor: { value: new Color('#78a0ff') } },
        transparent: true,
        depthWrite: false,
        side: BackSide,
      }),
    [],
  );
  return (
    <mesh material={material}>
      <sphereGeometry args={[40, 48, 24]} />
    </mesh>
  );
}
```

- [ ] **Step 4: Dust.tsx**

```tsx
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Points } from 'three';
import { useReducedMotion } from '../lib/hooks';
import { mulberry32 } from './layout';

const COUNT = 400;

export function Dust() {
  const ref = useRef<Points>(null);
  const reduced = useReducedMotion();
  const positions = useMemo(() => {
    const rand = mulberry32(7);
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r = 4 + rand() * 9;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((state, dt) => {
    if (!ref.current || reduced) return;
    ref.current.rotation.y += dt * 0.01;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.2;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} sizeAttenuation transparent opacity={0.3} color="#dbe4f0" depthWrite={false} />
    </points>
  );
}
```

- [ ] **Step 5: CameraRig.tsx**

```tsx
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { MathUtils, Vector3 } from 'three';
import { useStore } from '../lib/store';
import { placementById } from './machine';

interface ControlsLike {
  target: Vector3;
  update(): void;
}

const HOME_DISTANCE = 16;
const FOCUS_OFFSET = 5;
const SMOOTHING = 4;

export function CameraRig() {
  const selected = useStore((s) => s.selected);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const gl = useThree((s) => s.gl);
  const target = useMemo(() => new Vector3(), []);
  const desired = useMemo(() => new Vector3(), []);

  // OrbitControls sets touch-action:none; allow vertical page scrolling on touch devices.
  useEffect(() => {
    if (controls) gl.domElement.style.touchAction = 'pan-y';
  }, [controls, gl]);

  useFrame(({ camera }, dt) => {
    if (!controls) return;
    const p = selected ? placementById[selected] : undefined;
    if (p) {
      target.set(p.position[0], p.position[1], p.position[2]);
      desired.copy(target).normalize().multiplyScalar(target.length() + FOCUS_OFFSET);
    } else {
      target.set(0, 0, 0);
      desired.copy(camera.position).normalize().multiplyScalar(HOME_DISTANCE);
    }
    controls.target.x = MathUtils.damp(controls.target.x, target.x, SMOOTHING, dt);
    controls.target.y = MathUtils.damp(controls.target.y, target.y, SMOOTHING, dt);
    controls.target.z = MathUtils.damp(controls.target.z, target.z, SMOOTHING, dt);
    camera.position.x = MathUtils.damp(camera.position.x, desired.x, SMOOTHING, dt);
    camera.position.y = MathUtils.damp(camera.position.y, desired.y, SMOOTHING, dt);
    camera.position.z = MathUtils.damp(camera.position.z, desired.z, SMOOTHING, dt);
    controls.update();
  });

  return null;
}
```

- [ ] **Step 6: Effects.tsx**

```tsx
import { Bloom, EffectComposer } from '@react-three/postprocessing';

export function Effects() {
  return (
    <EffectComposer>
      <Bloom intensity={0.6} luminanceThreshold={0.2} luminanceSmoothing={0.3} mipmapBlur />
    </EffectComposer>
  );
}
```

- [ ] **Step 7: Machine.tsx**

```tsx
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { TOUCH } from 'three';
import { projectById } from '../lib/data';
import { useMediaQuery, useReducedMotion } from '../lib/hooks';
import { useStore } from '../lib/store';
import { CameraRig } from './CameraRig';
import { Dust } from './Dust';
import { Effects } from './Effects';
import { Gear } from './Gear';
import { GridBackdrop } from './GridBackdrop';
import { Links } from './Links';
import { links, placements } from './machine';

const BG = '#0b0f17';

export function Machine() {
  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always');
  const small = useMediaQuery('(max-width: 600px)');
  const coarse = useMediaQuery('(pointer: coarse)');
  const reduced = useReducedMotion();
  const hasInteracted = useStore((s) => s.hasInteracted);
  const selected = useStore((s) => s.selected);
  const setSelected = useStore((s) => s.setSelected);
  const markInteracted = useStore((s) => s.markInteracted);

  useEffect(() => {
    const onVisibility = () => setFrameloop(document.hidden ? 'never' : 'always');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={frameloop}
      camera={{ position: [0, 0, 16], fov: 45, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onPointerMissed={() => setSelected(null)}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 14, 26]} />
      <GridBackdrop />
      {!small && <Dust />}
      {placements.map((p) => (
        <Gear key={p.id} placement={p} project={projectById[p.id]} spinDir={links.spinDir[p.id] ?? 1} />
      ))}
      <Links />
      <OrbitControls
        makeDefault
        enableZoom={coarse}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        minDistance={8}
        maxDistance={24}
        autoRotate={!hasInteracted && !reduced && selected === null}
        autoRotateSpeed={0.4}
        touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }}
        onStart={markInteracted}
      />
      <CameraRig />
      {!small && <Effects />}
    </Canvas>
  );
}
```

- [ ] **Step 8: Temporary App.tsx and CSS to see the scene**

Replace `src/App.tsx`:
```tsx
import { Machine } from './scene/Machine';

export default function App() {
  return (
    <main>
      <section className="machine" aria-label="Projects">
        <Machine />
      </section>
    </main>
  );
}
```

Append to `src/styles/global.css`:
```css
/* --- Machine section ---------------------------------------------------- */
.machine {
  position: relative;
  height: 100vh;
  height: 100svh;
  width: 100%;
  background: var(--bg);
}

.machine canvas {
  display: block;
}

.gear-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border: 1px solid var(--line);
  background: var(--panel);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  white-space: nowrap;
  color: var(--ink);
}

.gear-label__lang {
  color: var(--muted);
  font-size: 9px;
  text-transform: uppercase;
}
```

- [ ] **Step 9: Type-check and run in the browser**

Run: `npx tsc --noEmit && pnpm dev`
Open `http://localhost:5173` and verify:
- Gears render as coloured wireframes with translucent faces on a dark background, grid faintly visible behind, dust drifting, slow auto-rotation.
- Hovering a gear speeds it up, brightens it, shows the label, and highlights its shaft lines; the cursor becomes a pointer.
- Clicking a gear eases the camera in toward it; clicking empty space eases back out. Dragging orbits and stops auto-rotation.
- No console errors. Check the FPS via the browser performance panel: should be ~60fps on a laptop.
- Narrow the window below 600px: bloom and dust disappear, scene still renders.

If `fwidth` errors appear in the console, change the grid shader `gridLine` to a fixed-width version: `float f = abs(fract(scaled - 0.5) - 0.5); return 1.0 - smoothstep(0.0, 0.02 * width, f);`.

- [ ] **Step 10: Commit**

```bash
git add src/scene src/App.tsx src/styles/global.css
git commit -m "feat: clockwork constellation 3D scene

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Hero overlay and language legend

**Files:**
- Create: `src/ui/HeroOverlay.tsx`, `src/ui/Legend.tsx`, `src/ui/MachineSection.tsx`
- Modify: `src/App.tsx`, `src/styles/global.css` (append)

**Interfaces:**
- Consumes: `site`, `meta`, `projects`, `useStore`, `languageColor`, `languageLabel`, `hasWebGL`, `<Machine />`.
- Produces: `<MachineSection />` (renders canvas or static fallback + overlay), `<HeroOverlay />`, `<Legend />`.

- [ ] **Step 1: Legend.tsx**

```tsx
import { projects } from '../lib/data';
import { languageColor, languageLabel } from '../lib/palette';
import { useStore } from '../lib/store';

interface Entry {
  language: string;
  color: string;
  count: number;
}

const entries: Entry[] = (() => {
  const counts = new Map<string, Entry>();
  for (const p of projects) {
    const language = languageLabel(p.language);
    const e = counts.get(language) ?? { language, color: languageColor(p.language), count: 0 };
    e.count += 1;
    counts.set(language, e);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.language.localeCompare(b.language));
})();

export function Legend() {
  const filter = useStore((s) => s.filter);
  const toggleFilter = useStore((s) => s.toggleFilter);
  return (
    <ul className="legend" aria-label="Filter projects by language">
      {entries.map((e) => {
        const active = filter === e.language;
        return (
          <li key={e.language}>
            <button type="button" className={`legend__item${active ? ' is-active' : ''}`} onClick={() => toggleFilter(e.language)} aria-pressed={active}>
              <span className="legend__swatch" style={{ background: e.color }} />
              <span className="legend__name">{e.language}</span>
              <span className="legend__count">{e.count}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: HeroOverlay.tsx**

```tsx
import { meta } from '../lib/data';
import { site } from '../lib/siteContent';
import { useStore } from '../lib/store';
import { Legend } from './Legend';

export function HeroOverlay() {
  const hasInteracted = useStore((s) => s.hasInteracted);
  const rev = meta.fetchedAt.slice(0, 10);
  return (
    <div className="hero">
      <header className="hero__head">
        <h1 className="hero__name">{site.name}</h1>
        <p className="hero__tagline">{site.tagline}</p>
      </header>
      <nav className="hero__nav" aria-label="Sections">
        <a href="#about">About</a>
        <a href="#skills">Skills</a>
        <a href="#contact">Contact</a>
        <a href={meta.profileUrl} target="_blank" rel="noopener noreferrer">
          GitHub ↗
        </a>
      </nav>
      <div className="hero__legend">
        <Legend />
      </div>
      <div className="hero__corner">
        <p className={`hero__hint${hasInteracted ? ' is-hidden' : ''}`} aria-hidden={hasInteracted}>
          drag to orbit · click a gear
        </p>
        <p className="hero__stamp label">
          Sheet 1/4 · Rev {rev}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: MachineSection.tsx (with static fallback)**

```tsx
import { useMemo } from 'react';
import { projects } from '../lib/data';
import { hasWebGL } from '../lib/webgl';
import { Machine } from '../scene/Machine';
import { HeroOverlay } from './HeroOverlay';

function StaticProjects() {
  return (
    <ul className="machine__fallback">
      {projects.map((p) => (
        <li key={p.id}>
          <a href={p.url} target="_blank" rel="noopener noreferrer">
            {p.title}
          </a>
          {p.language && <span className="label"> {p.language}</span>}
        </li>
      ))}
    </ul>
  );
}

export function MachineSection() {
  const webgl = useMemo(hasWebGL, []);
  return (
    <section className="machine" id="projects" aria-label="Projects">
      {webgl ? <Machine /> : <StaticProjects />}
      <HeroOverlay />
    </section>
  );
}
```

- [ ] **Step 4: App.tsx uses MachineSection**

```tsx
import { MachineSection } from './ui/MachineSection';

export default function App() {
  return (
    <main>
      <MachineSection />
    </main>
  );
}
```

- [ ] **Step 5: Append overlay CSS to global.css**

```css
/* --- Hero overlay ------------------------------------------------------- */
.hero {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto 1fr auto;
  padding: var(--gutter);
  padding-top: calc(var(--gutter) + env(safe-area-inset-top, 0px));
  gap: 16px;
}

.hero > * {
  pointer-events: auto;
}

.hero__head {
  grid-column: 1;
  grid-row: 1;
  max-width: 28rem;
}

.hero__name {
  margin: 0;
  font-size: clamp(1.4rem, 3.5vw, 2.4rem);
  font-weight: 600;
  line-height: 1.1;
  text-shadow: 0 0 24px rgba(94, 225, 255, 0.25);
}

.hero__tagline {
  margin: 8px 0 0;
  color: var(--muted);
  font-family: var(--mono);
  font-size: 0.85rem;
}

.hero__nav {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  gap: 20px;
  font-family: var(--mono);
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero__nav a {
  color: var(--ink);
  border-bottom: 1px solid transparent;
}

.hero__nav a:hover {
  text-decoration: none;
  border-bottom-color: var(--accent);
}

.hero__legend {
  grid-column: 1;
  grid-row: 3;
  align-self: end;
}

.hero__corner {
  grid-column: 2;
  grid-row: 3;
  align-self: end;
  text-align: right;
}

.hero__hint {
  margin: 0 0 8px;
  color: var(--muted);
  font-family: var(--mono);
  font-size: 0.75rem;
  transition: opacity 0.6s ease;
}

.hero__hint.is-hidden {
  opacity: 0;
}

.hero__stamp {
  margin: 0;
}

.legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  max-width: 60vw;
}

.legend__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border: 1px solid transparent;
  background: none;
  color: var(--ink);
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  cursor: pointer;
}

.legend__item:hover {
  border-color: var(--line);
}

.legend__item.is-active {
  border-color: var(--accent);
}

.legend__item.is-active::before {
  content: '[';
  color: var(--accent);
}

.legend__item.is-active::after {
  content: ']';
  color: var(--accent);
}

.legend__swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  box-shadow: 0 0 8px currentColor;
}

.legend__count {
  color: var(--muted);
}

.machine__fallback {
  list-style: none;
  margin: 0;
  padding: calc(var(--gutter) + 6rem) var(--gutter) var(--gutter);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}

@media (max-width: 640px) {
  .hero {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr auto auto;
  }
  .hero__head,
  .hero__nav,
  .hero__legend,
  .hero__corner {
    grid-column: 1;
  }
  .hero__head { grid-row: 1; }
  .hero__nav { grid-row: 2; flex-wrap: wrap; gap: 12px; }
  .hero__legend { grid-row: 4; }
  .hero__corner { grid-row: 5; text-align: left; }
  .legend { max-width: none; }
}
```

- [ ] **Step 6: Verify in the browser**

Run: `npx tsc --noEmit && pnpm dev`
Verify: name/tagline top-left, nav top-right, legend bottom-left with correct counts, hint + stamp bottom-right. Clicking a legend entry dims the other gears and their links; clicking it again restores. The hint fades after the first drag or click. Dragging still orbits where the overlay has no elements. At 390px width the overlay stacks and nothing overflows horizontally.

- [ ] **Step 7: Commit**

```bash
git add src/ui src/App.tsx src/styles/global.css
git commit -m "feat: hero overlay with language legend filter and WebGL fallback

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Detail panel with README excerpt and keyboard cycling

**Files:**
- Create: `src/lib/markdown.ts`, `src/ui/DetailPanel.tsx`
- Modify: `src/ui/MachineSection.tsx`, `src/styles/global.css` (append)
- Test: `src/lib/markdown.test.ts`

**Interfaces:**
- Produces: `renderMarkdown(md: string): string` (sanitised HTML; links get `target="_blank" rel="noopener noreferrer"`), `<DetailPanel />`.

- [ ] **Step 1: Write the failing markdown test**

`src/lib/markdown.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders headings, paragraphs and code', () => {
    const html = renderMarkdown('# Title\n\nSome `code` here.');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<code>code</code>');
  });

  it('strips scripts and event handlers', () => {
    const html = renderMarkdown('<script>alert(1)</script><img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
  });

  it('opens links in a new tab safely', () => {
    const html = renderMarkdown('[gh](https://github.com)');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test markdown`
Expected: FAIL — cannot resolve `./markdown`.

- [ ] **Step 3: Implement markdown.ts**

`src/lib/markdown.ts`:
```ts
import DOMPurify from 'dompurify';
import { marked } from 'marked';

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false, gfm: true });
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ['target'] });
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 5: DetailPanel.tsx**

```tsx
import { useEffect, useMemo, useRef } from 'react';
import { projectById } from '../lib/data';
import { renderMarkdown } from '../lib/markdown';
import { languageLabel } from '../lib/palette';
import { useStore } from '../lib/store';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: '2-digit' });
}

export function DetailPanel() {
  const selected = useStore((s) => s.selected);
  const setSelected = useStore((s) => s.setSelected);
  const project = selected ? projectById[selected] : null;
  const panel = useRef<HTMLElement>(null);
  const readme = useMemo(() => (project?.readmeExcerpt ? renderMarkdown(project.readmeExcerpt) : null), [project]);

  useEffect(() => {
    if (!project) return;
    const el = panel.current;
    const previous = document.activeElement as HTMLElement | null;
    el?.querySelector<HTMLElement>('.panel__close')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelected(null);
        return;
      }
      if (e.key === 'Tab' && el) {
        const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        e.stopPropagation();
      }
    };
    el?.addEventListener('keydown', onKey);
    return () => {
      el?.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [project, setSelected]);

  return (
    <aside ref={panel} className={`panel${project ? ' is-open' : ''}`} aria-hidden={!project} aria-label="Project details">
      {project && (
        <>
          <button type="button" className="panel__close" onClick={() => setSelected(null)} aria-label="Close">
            ✕
          </button>
          <table className="panel__block">
            <tbody>
              <tr>
                <th>Name</th>
                <td>{project.title}</td>
              </tr>
              <tr>
                <th>Language</th>
                <td>{languageLabel(project.language)}</td>
              </tr>
              <tr>
                <th>Stars</th>
                <td>{project.stars}</td>
              </tr>
              <tr>
                <th>Updated</th>
                <td>{formatDate(project.pushedAt)}</td>
              </tr>
              <tr>
                <th>Topics</th>
                <td>{project.topics.length ? project.topics.join(', ') : '—'}</td>
              </tr>
            </tbody>
          </table>
          <p className="panel__blurb">{project.blurb ?? 'No description yet.'}</p>
          <div className="panel__actions">
            <a className="button" href={project.url} target="_blank" rel="noopener noreferrer">
              Open on GitHub ↗
            </a>
            {project.homepage && (
              <a className="button button--ghost" href={project.homepage} target="_blank" rel="noopener noreferrer">
                Live demo ↗
              </a>
            )}
          </div>
          {project.image && <img className="panel__image" src={project.image} alt="" />}
          {readme && (
            <section className="panel__readme">
              <p className="label">README</p>
              <div className="panel__markdown" dangerouslySetInnerHTML={{ __html: readme }} />
            </section>
          )}
        </>
      )}
    </aside>
  );
}
```

- [ ] **Step 6: Add keyboard cycling and the panel to MachineSection.tsx**

Replace `src/ui/MachineSection.tsx`:
```tsx
import { useMemo, type KeyboardEvent } from 'react';
import { projects } from '../lib/data';
import { useStore } from '../lib/store';
import { hasWebGL } from '../lib/webgl';
import { Machine } from '../scene/Machine';
import { placements } from '../scene/machine';
import { DetailPanel } from './DetailPanel';
import { HeroOverlay } from './HeroOverlay';

function StaticProjects() {
  return (
    <ul className="machine__fallback">
      {projects.map((p) => (
        <li key={p.id}>
          <a href={p.url} target="_blank" rel="noopener noreferrer">
            {p.title}
          </a>
          {p.language && <span className="label"> {p.language}</span>}
        </li>
      ))}
    </ul>
  );
}

const order = placements.map((p) => p.id);

/** Tab cycles through gears while the stage itself is focused; leaves the section after the last one. */
function cycle(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== 'Tab' || e.target !== e.currentTarget) return;
  const { selected, setSelected } = useStore.getState();
  const i = selected ? order.indexOf(selected) : -1;
  const next = e.shiftKey ? i - 1 : i + 1;
  if (next < 0 || next >= order.length) {
    setSelected(null);
    return;
  }
  e.preventDefault();
  setSelected(order[next]);
}

export function MachineSection() {
  const webgl = useMemo(hasWebGL, []);
  return (
    <section className="machine" id="projects" aria-label="Projects">
      {webgl ? (
        <div className="machine__stage" tabIndex={0} onKeyDown={cycle} aria-label="Project constellation. Press Tab to step through projects.">
          <Machine />
        </div>
      ) : (
        <StaticProjects />
      )}
      <HeroOverlay />
      {webgl && <DetailPanel />}
    </section>
  );
}
```

- [ ] **Step 7: Append panel CSS to global.css**

```css
/* --- Detail panel ------------------------------------------------------- */
.machine__stage {
  position: absolute;
  inset: 0;
  outline: none;
}

.machine__stage:focus-visible {
  box-shadow: inset 0 0 0 2px var(--accent);
}

.panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(420px, 100vw);
  padding: var(--gutter);
  padding-top: calc(var(--gutter) + env(safe-area-inset-top, 0px));
  overflow-y: auto;
  background: var(--panel);
  backdrop-filter: blur(8px);
  border-left: 1px solid var(--line);
  transform: translateX(100%);
  transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
  z-index: 20;
}

.panel.is-open {
  transform: translateX(0);
}

.panel__close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: 1px solid var(--line);
  background: none;
  color: var(--ink);
  font-family: var(--mono);
  cursor: pointer;
}

.panel__close:hover {
  border-color: var(--accent);
}

.panel__block {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--line);
  font-family: var(--mono);
  font-size: 0.8rem;
  margin-top: 24px;
}

.panel__block th,
.panel__block td {
  border: 1px solid var(--line);
  padding: 6px 10px;
  text-align: left;
  vertical-align: top;
}

.panel__block th {
  width: 34%;
  color: var(--muted);
  font-weight: 400;
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.panel__blurb {
  margin: 20px 0;
}

.panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.button {
  display: inline-block;
  padding: 8px 14px;
  border: 1px solid var(--accent);
  background: rgba(94, 225, 255, 0.1);
  color: var(--ink);
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.button:hover {
  text-decoration: none;
  background: rgba(94, 225, 255, 0.2);
}

.button--ghost {
  border-color: var(--line);
  background: none;
}

.panel__image {
  display: block;
  width: 100%;
  margin-top: 20px;
  border: 1px solid var(--line);
}

.panel__readme {
  margin-top: 28px;
  padding-top: 16px;
  border-top: 1px dashed var(--line);
}

.panel__markdown {
  max-height: 40vh;
  overflow: auto;
  padding-right: 8px;
  font-size: 0.9rem;
}

.panel__markdown h1,
.panel__markdown h2,
.panel__markdown h3 {
  font-size: 0.95rem;
  margin: 1em 0 0.4em;
}

.panel__markdown pre {
  overflow-x: auto;
  padding: 8px;
  border: 1px solid var(--line);
  font-size: 0.78rem;
}

.panel__markdown img {
  max-width: 100%;
}

@media (max-width: 640px) {
  .panel {
    top: auto;
    left: 0;
    width: 100%;
    height: 70vh;
    border-left: 0;
    border-top: 1px solid var(--line);
    transform: translateY(100%);
  }
  .panel.is-open {
    transform: translateY(0);
  }
}
```

- [ ] **Step 8: Verify in the browser**

Run: `npx tsc --noEmit && pnpm dev`
Verify: clicking a gear opens the panel with the title block, blurb, buttons and a README excerpt (for repos that have one). Esc closes; ✕ closes; clicking empty space closes. Tab with focus on the stage steps through gears and opens each; Shift+Tab goes back. Inside the panel, Tab cycles between ✕ and the buttons only. At 390px width the panel is a bottom sheet. README links open in a new tab.

- [ ] **Step 9: Commit**

```bash
git add src/lib/markdown.ts src/lib/markdown.test.ts src/ui src/styles/global.css
git commit -m "feat: project detail panel with README excerpt and keyboard cycling

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: About, Skills, Contact sheets and footer

**Files:**
- Create: `src/ui/Sheet.tsx`, `src/ui/sections/About.tsx`, `src/ui/sections/Skills.tsx`, `src/ui/sections/Contact.tsx`, `src/ui/Footer.tsx`
- Modify: `src/App.tsx`, `src/styles/global.css` (append)

**Interfaces:**
- Consumes: `site`, `skills`, `aboutMarkdown`, `meta`, `languageBytes`, `renderMarkdown`, `languageColor`.
- Produces: `<Sheet id title number>` wrapper; `<About />`, `<Skills />`, `<Contact />`, `<Footer />`.

- [ ] **Step 1: Sheet.tsx**

```tsx
import type { ReactNode } from 'react';

interface Props {
  id: string;
  title: string;
  number: number;
  children: ReactNode;
}

const TOTAL = 4;

export function Sheet({ id, title, number, children }: Props) {
  return (
    <section id={id} className="sheet" aria-labelledby={`${id}-title`}>
      <div className="sheet__frame">
        <h2 id={`${id}-title`} className="sheet__title">
          {title}
        </h2>
        <div className="sheet__body">{children}</div>
        <p className="sheet__stamp label">
          Sheet {number}/{TOTAL} · {title}
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: About.tsx**

```tsx
import { useMemo } from 'react';
import { meta } from '../../lib/data';
import { renderMarkdown } from '../../lib/markdown';
import { aboutMarkdown, site } from '../../lib/siteContent';
import { Sheet } from '../Sheet';

export function About() {
  const html = useMemo(() => renderMarkdown(aboutMarkdown), []);
  return (
    <Sheet id="about" title="About" number={2}>
      <div className="about">
        <img className="about__avatar" src={meta.avatarUrl} alt={`${site.name}'s avatar`} width={120} height={120} loading="lazy" />
        <div className="about__text" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </Sheet>
  );
}
```

- [ ] **Step 3: Skills.tsx**

```tsx
import { languageBytes } from '../../lib/data';
import { languageColor } from '../../lib/palette';
import { skills } from '../../lib/siteContent';
import { Sheet } from '../Sheet';

const MIN_SHARE = 0.01;

const bar = (() => {
  const total = Object.values(languageBytes).reduce((s, b) => s + b, 0);
  return Object.entries(languageBytes)
    .map(([language, bytes]) => ({ language, share: total ? bytes / total : 0 }))
    .filter((e) => e.share >= MIN_SHARE)
    .sort((a, b) => b.share - a.share);
})();

export function Skills() {
  return (
    <Sheet id="skills" title="Skills" number={3}>
      <p className="label">Languages by bytes across public repos</p>
      <div className="langbar" role="img" aria-label={bar.map((e) => `${e.language} ${Math.round(e.share * 100)}%`).join(', ')}>
        {bar.map((e) => (
          <span key={e.language} className="langbar__seg" style={{ width: `${e.share * 100}%`, background: languageColor(e.language) }} title={`${e.language} ${Math.round(e.share * 100)}%`} />
        ))}
      </div>
      <ul className="langbar__legend">
        {bar.map((e) => (
          <li key={e.language}>
            <span className="legend__swatch" style={{ background: languageColor(e.language) }} /> {e.language} <span className="legend__count">{Math.round(e.share * 100)}%</span>
          </li>
        ))}
      </ul>
      <div className="skills">
        {skills.map((g) => (
          <div key={g.group} className="skills__group">
            <p className="label">{g.group}</p>
            <ul>
              {g.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
```

- [ ] **Step 4: Contact.tsx and Footer.tsx**

`src/ui/sections/Contact.tsx`:
```tsx
import { meta } from '../../lib/data';
import { site } from '../../lib/siteContent';
import { Sheet } from '../Sheet';

export function Contact() {
  const rows: { label: string; href: string; text: string }[] = [
    { label: 'Email', href: `mailto:${site.email}`, text: site.email },
    { label: 'GitHub', href: meta.profileUrl, text: `github.com/${site.github}` },
  ];
  if (site.linkedin) rows.push({ label: 'LinkedIn', href: site.linkedin, text: site.linkedin.replace(/^https?:\/\//, '') });
  if (site.resume) rows.push({ label: 'Resume', href: site.resume, text: 'Download PDF' });
  return (
    <Sheet id="contact" title="Contact" number={4}>
      <table className="panel__block contact">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th>{r.label}</th>
              <td>
                <a href={r.href} target={r.href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer">
                  {r.text}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Sheet>
  );
}
```

`src/ui/Footer.tsx`:
```tsx
import { meta } from '../lib/data';

export function Footer() {
  return (
    <footer className="footer label">
      Drawn with Three.js · rebuilt {meta.fetchedAt.slice(0, 10)}
    </footer>
  );
}
```

- [ ] **Step 5: Final App.tsx**

```tsx
import { Footer } from './ui/Footer';
import { MachineSection } from './ui/MachineSection';
import { About } from './ui/sections/About';
import { Contact } from './ui/sections/Contact';
import { Skills } from './ui/sections/Skills';

export default function App() {
  return (
    <main>
      <MachineSection />
      <About />
      <Skills />
      <Contact />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 6: Append sheet CSS to global.css**

```css
/* --- Sheets ------------------------------------------------------------- */
.sheet {
  padding: var(--gutter);
}

.sheet__frame {
  position: relative;
  max-width: 960px;
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px);
  border: 1px solid var(--line);
  background: rgba(11, 15, 23, 0.6);
}

.sheet__frame::before,
.sheet__frame::after {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  border-color: var(--accent);
  border-style: solid;
}

.sheet__frame::before {
  top: -1px;
  left: -1px;
  border-width: 1px 0 0 1px;
}

.sheet__frame::after {
  bottom: -1px;
  right: -1px;
  border-width: 0 1px 1px 0;
}

.sheet__title {
  margin: 0 0 24px;
  font-size: 1rem;
  color: var(--accent);
}

.sheet__stamp {
  margin: 32px 0 0;
  text-align: right;
}

.about {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.about__avatar {
  flex: 0 0 auto;
  border: 1px solid var(--line);
  padding: 4px;
}

.about__text {
  flex: 1 1 320px;
  max-width: 60ch;
}

.about__text p:first-child {
  margin-top: 0;
}

.langbar {
  display: flex;
  height: 14px;
  margin: 8px 0 12px;
  border: 1px solid var(--line);
  overflow: hidden;
}

.langbar__seg {
  display: block;
  height: 100%;
}

.langbar__legend {
  list-style: none;
  margin: 0 0 32px;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  font-family: var(--mono);
  font-size: 0.75rem;
}

.langbar__legend li {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.skills {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 24px;
}

.skills__group ul {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  font-family: var(--mono);
  font-size: 0.85rem;
}

.skills__group li::before {
  content: '— ';
  color: var(--muted);
}

.contact {
  margin-top: 0;
  max-width: 560px;
}

.footer {
  padding: var(--gutter);
  padding-bottom: calc(var(--gutter) + env(safe-area-inset-bottom, 0px));
  text-align: center;
}
```

- [ ] **Step 7: Verify in the browser**

Run: `npx tsc --noEmit && pnpm test && pnpm dev`
Verify: scrolling past the machine shows About (avatar + text), Skills (stacked language bar with percentages summing to ~100, tool groups), Contact (email + GitHub rows; LinkedIn/resume rows absent until set in `site.yml`), and the footer. Nav links in the hero scroll to each sheet. At 390px width: no horizontal scroll, sheets stack cleanly.

- [ ] **Step 8: Commit**

```bash
git add src/ui src/App.tsx src/styles/global.css
git commit -m "feat: about, skills, contact sheets and footer

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: Deploy workflow, README, final verification

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1: Write the workflow**

`.github/workflows/deploy.yml`:
```yaml
name: Build and deploy

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm build
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          VITE_BASE: /${{ github.event.repository.name }}/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Write README.md**

````markdown
# Clockwork portfolio

A static portfolio where every public GitHub repository is a gear in a 3D blueprint-style mechanism (Three.js via @react-three/fiber).

## Develop

```sh
pnpm install
pnpm sync      # fetch repos from GitHub → src/data/*.json (set GITHUB_TOKEN for a higher rate limit)
pnpm dev       # http://localhost:5173
pnpm test
pnpm build     # runs sync first, then type-checks and builds to dist/
```

## Edit content

| File | What |
|---|---|
| `content/site.yml` | name, tagline, GitHub user, email, optional `linkedin`, `resume` |
| `content/about.md` | About text (Markdown) |
| `content/skills.yml` | groups of tools |
| `content/projects.yml` | per-repo overrides: `title`, `blurb`, `hidden`, `featured`, `image`, `homepage` |

## Deploy

`.github/workflows/deploy.yml` builds nightly and on every push to `main`, then publishes `dist/` to GitHub Pages (enable Pages → Source: GitHub Actions in the repo settings). The `VITE_BASE` env sets the URL base; leave it unset for a root deploy on Vercel/Netlify.
````

- [ ] **Step 3: Full verification**

Run: `pnpm test && pnpm build && pnpm preview`
Expected: all tests pass, build succeeds. Open the preview URL and walk the checklist:
- Machine renders, orbits, hover/click/filter/panel all work.
- `prefers-reduced-motion` (emulate in devtools rendering panel): no auto-rotate, dust static, gears slow.
- Hide the tab and return: animation resumes without a jump in speed.
- 390px viewport: overlay stacked, bottom-sheet panel, no bloom, no horizontal scroll, vertical swipe scrolls the page, horizontal swipe orbits.
- Lighthouse (desktop): performance ≥ 80, accessibility ≥ 90.

- [ ] **Step 4: Commit**

```bash
git add .github README.md
git commit -m "chore: GitHub Pages deploy workflow and README

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
