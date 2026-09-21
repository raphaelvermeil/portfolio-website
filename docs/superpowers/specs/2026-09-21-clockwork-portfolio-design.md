# Clockwork Portfolio — Design Spec

**Date:** 2026-09-21
**Owner:** Raphael Vermeil (github.com/raphaelvermeil)
**Status:** Approved

## 1. Goal

A personal portfolio site that showcases Raphael's public GitHub repositories in an original, eye-catching way. The centrepiece is a **clockwork constellation**: every repository is a procedurally generated gear floating in a 3D mechanism, rendered in a **blueprint / technical-drawing** style with Three.js. Below the machine, conventional About / Skills / Contact sections styled as engineering drawing sheets.

Repository data is fetched from the GitHub API **at build time**, so the live site is fully static and works without secrets or client-side API calls.

## 2. Non-goals

- No CMS, no backend, no client-side GitHub calls.
- No scroll-driven camera path or 3D content outside the hero section (may be added later).
- No blog.
- No realistic PBR materials or model files; all geometry is procedural.

## 3. Stack

| Concern | Choice |
|---|---|
| Build | Vite 8, TypeScript 5.9, pnpm, Node 20 |
| UI | React 19.2 (required by @react-three/fiber 9) |
| 3D | `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` (bloom only) |
| State | `zustand` (hovered / selected / language filter) |
| Content | YAML + Markdown in `content/`, parsed with `js-yaml` and `marked` |
| Tests | Vitest (pure logic only) |
| Deploy | Static `dist/`; GitHub Actions workflow → GitHub Pages by default (nightly + on push). Works unchanged on Vercel/Netlify. |

## 4. Page layout

Single page, top to bottom:

1. **Machine section** — 100vh, the 3D scene with an HTML overlay. This section is both the hero and the projects showcase.
2. **About** sheet
3. **Skills** sheet
4. **Contact** sheet
5. Footer: "Drawn with Three.js · rebuilt <fetchedAt date>".

Page scroll is native. The canvas captures pointer drag (orbit) and touch pinch (zoom) only; mouse wheel is left to the page.

## 5. The machine (3D scene)

### 5.1 Gears

- One gear per repo after filtering (see §7). ~21 today.
- **Geometry** is procedural (`src/scene/gearGeometry.ts`): a spur gear profile (outer radius, root radius, tooth count, bore hole) extruded to a thin thickness. Tooth count = `round(radius * TEETH_PER_UNIT)` clamped to [8, 28], so tooth size looks uniform across gears.
- **Rendering**: `EdgesGeometry` line segments (the drawing lines) over a translucent face material at ~8% opacity. Edge colour is the language colour and is emissive so bloom picks it up.
- **Colour** = primary language, from a fixed palette in `src/lib/palette.ts`. Unknown / null language → neutral grey.
- **Radius** = activity score mapped to [0.6, 1.6] (see §7.2).
- **Spin**: each gear rotates about its own axis. Direction alternates along shaft chains so linked gears counter-rotate. Base speed ~0.15 rad/s; hovered gear ×4; selected gear ×2.
- **Featured** gears (from overrides) get a thin pulsing ring at 1.15× radius.

### 5.2 Layout (`src/scene/layout.ts`)

- Deterministic: seeded PRNG (mulberry32) from repo names, so layout is identical across builds and renders.
- Languages are sorted by repo count; each gets an angular sector on a sphere shell of radius ~7 (sector width proportional to count, min width so single-repo languages still get room).
- Within a sector, gears are distributed by a small Fibonacci-sphere sub-sampling with jitter (±0.6 units) and a radial jitter (shell 6–8).
- Post-pass: iterative relaxation (≤50 iterations) pushing any two gears apart until their distance ≥ `rA + rB + 0.4`.
- Each gear's facing normal is its position direction plus small random tilt, so gears face outward like a constellation seen from inside-out.
- Output: `{ id, position: [x,y,z], quaternion, radius, teeth, language, spinDir }[]`.

### 5.3 Links (`src/scene/links.ts`)

- **Shafts**: within each language cluster, connect each gear to its nearest same-language neighbour, then add edges from a minimum spanning tree so the cluster is connected. Rendered as thin straight `Line` segments at 35% opacity.
- **Belts**: connect each cluster to the next (by sorted order) via the closest pair of gears between them, drawn as a Catmull-Rom tube (radius 0.03) through a midpoint offset outward. Rendered at 25% opacity.
- Links highlight (opacity → 80%) when either endpoint is hovered or selected.
- `spinDir` is assigned by BFS over shaft edges: alternate sign each hop; belts do not constrain.

### 5.4 Camera and atmosphere

- Perspective camera at distance ~16, fov 45. `OrbitControls` from drei: `enableZoom={false}` on mouse (pinch zoom allowed on touch via `touches` config), `enablePan={false}`, `autoRotate` at 0.4 until first user drag, damping on.
- Selecting a gear eases the camera target to the gear and the distance to ~6 (lerp over ~0.8s); deselecting eases back.
- Background: `#0b0f17`. A large plane far behind the shell with a shader-drawn blueprint grid (major/minor lines, 5% / 2.5% opacity). `fog` from 14 to 26.
- Dust: 400 `Points` with random slow drift, 1.5px, 30% opacity.
- Post: `EffectComposer` with `Bloom` (intensity 0.6, luminanceThreshold 0.2). Disabled below 600px width.

### 5.5 Interaction

| Input | Effect |
|---|---|
| Hover gear | Spin ×4, edge brightness ×1.6, label (name + language) via drei `Html`, connected links highlight |
| Click gear | `selected = id`, camera frames it, detail panel opens |
| Click empty / Esc / panel ✕ | `selected = null`, camera returns |
| Tab / Shift+Tab | Cycle `selected` through gears in layout order (a11y) |
| Legend swatch click | Toggle language filter; non-matching gears → 15% opacity, spin stops; links to them fade |
| Drag | Orbit; stops auto-rotate for the session |
| `prefers-reduced-motion` | No auto-rotate, no dust drift, gears spin at 0.25× |

### 5.6 Performance

- One `InstancedMesh` per distinct tooth-count bucket is *not* used (radii differ); instead each gear is a separate mesh but geometry is memoised per `(radius, teeth)` and there are ~21 of them, which is trivial. Edge lines use `LineSegments`.
- `dpr={[1, 2]}`; `frameloop="always"` but the canvas pauses when `document.hidden`.
- Bloom and dust removed below 600px width.
- Target: 60fps on an M1 MacBook Air, ≥30fps on a mid-range phone.

## 6. Overlay UI

All HTML, positioned over the canvas, `pointer-events: none` on the wrapper and `auto` on interactive children.

- **Top-left**: name (`site.name`) in a monospace display face; tagline (`site.tagline`) underneath.
- **Top-right**: nav — About · Skills · Contact · GitHub. Smooth scroll to sections.
- **Bottom-left**: **Legend** — for each language present: swatch, name, count. Click toggles filter (single active language or none). Active state shown with a bracket `[ ]` decoration.
- **Bottom-right**: hint "drag to orbit · click a gear" (fades after first drag or click) and a decorative sheet stamp `SHEET 1/4 · REV <fetchedAt yyyy-mm-dd>`.

### 6.1 Detail panel

- Slides in from the right, width `min(420px, 100vw)`; on ≤640px it becomes a bottom sheet at 70vh.
- Styled as a blueprint **title block**: bordered rows for NAME, LANGUAGE, STARS, UPDATED, TOPICS.
- Description paragraph (`blurb` override, else GitHub description, else "No description yet.").
- Buttons: "Open on GitHub" (always), "Live demo" (if `homepage`).
- README excerpt: first 40 lines of the README rendered from markdown via `marked`, sanitised (no raw HTML, `<a>` gets `rel="noopener"`), inside a scrollable box.
- Closes with ✕, Esc, or click outside. Focus is trapped inside while open; focus returns to the canvas on close.

## 7. Data pipeline

### 7.1 Fetch script — `scripts/fetch-github.ts`

Run with `pnpm sync`; `pnpm build` runs it first via a `prebuild` script.

1. `GET https://api.github.com/users/<site.github>/repos?per_page=100&type=owner`
2. Filter out: `fork: true`, `archived: true`, and any name listed with `hidden: true` in `content/projects.yml`.
3. For each remaining repo, with concurrency 5:
   - `GET /repos/:owner/:name/languages` → `{ [lang]: bytes }`
   - `GET /repos/:owner/:name/readme` → decode base64, keep first 40 lines (404 → `null`)
4. Merge with overrides (§7.3), compute activity (§7.2).
5. Write:
   - `src/data/projects.json` — `Project[]`
   - `src/data/languages.json` — `{ [lang]: totalBytes }` across all included repos
   - `src/data/meta.json` — `{ fetchedAt, avatarUrl, profileUrl, name, bio }`
6. Auth: `Authorization: Bearer $GITHUB_TOKEN` if set; anonymous otherwise (≈43 requests today, within the 60/hr anonymous limit).
7. Failure policy: on any network/API error, if the three JSON files already exist, log a warning and exit 0 keeping old data; otherwise exit 1.

Generated JSON is **committed** so `pnpm dev` and CI builds work without network access or tokens.

### 7.2 Activity score — `src/lib/activity.ts`

```
recency  = clamp(1 - daysSincePush / 730, 0, 1)        // 0..1, two-year window
stars    = log2(stargazers + 1) / 4                     // 0..~1 for ≤15 stars
size     = clamp(log10(sizeKb + 1) / 4, 0, 1)           // 0..1
activity = 0.5*recency + 0.3*stars + 0.2*size          // 0..1
radius   = 0.6 + activity * 1.0                          // 0.6..1.6
```
Pure function, unit-tested.

### 7.3 Overrides — `content/projects.yml`

```yaml
# keyed by repo name
ECSEGAMES:
  title: ECSE Games
  blurb: A party of small browser games built for McGill ECSE events.
  featured: true
github-slideshow:
  hidden: true
```
Fields: `title`, `blurb`, `hidden`, `featured`, `image` (path under `public/`), `homepage` (overrides GitHub's). Override merging is a pure function, unit-tested.

### 7.4 Project shape — `src/lib/types.ts`

```ts
interface Project {
  id: string;            // repo name
  title: string;         // override or repo name
  blurb: string | null;
  url: string;           // html_url
  homepage: string | null;
  language: string | null;
  languages: Record<string, number>;
  stars: number;
  sizeKb: number;
  pushedAt: string;      // ISO
  topics: string[];
  readmeExcerpt: string | null;
  featured: boolean;
  image: string | null;
  activity: number;      // 0..1
}
```

## 8. Content sections

Each is a `<section>` rendered as a "sheet": bordered panel on the grid background, with a small title block in the bottom-right corner (`SHEET n/4 · <TITLE>`).

- **About** (`#about`): avatar from `meta.avatarUrl`; body from `content/about.md` rendered with `marked`.
- **Skills** (`#skills`): (a) a single stacked horizontal bar of languages by bytes from `languages.json`, using the same palette, with a legend; (b) a grid of tools from `content/skills.yml` (`- name`, optional `group`).
- **Contact** (`#contact`): links from `content/site.yml` — `email`, `github`, `linkedin`, optional `resume` (path under `public/`). Rendered as a bordered list.

`content/site.yml`:
```yaml
name: Raphael Vermeil
tagline: Engineering student · builds games, robots and neural nets
github: raphaelvermeil
email: raphael.vermeil@gmail.com
linkedin: https://www.linkedin.com/in/...
resume: /resume.pdf   # optional
```

## 9. Visual system

- Background `#0b0f17`; ink `#dbe4f0`; muted `#7d8ba1`; grid line `rgba(120,160,255,0.06)`; accent cyan `#5ee1ff`.
- Language palette (edge/emissive colours): TypeScript `#4fa3ff`, JavaScript `#ffd54a`, Java `#ff8a3d`, Python `#5fd67a`, HTML `#ff6b6b`, CSS `#c58cff`, Jupyter Notebook `#ffa64d`, Ruby `#ff4f6d`, C/C++ `#8fb3ff`, other `#9aa5b8`.
- Type: monospace display for headings/labels (system `ui-monospace` stack, optional `JetBrains Mono` via Google Fonts with fallback), a humanist sans for body.
- Hairline borders (`1px`), corner brackets on panels, uppercase tracking on labels.

## 10. Project structure

```
portfolio/
├─ content/
│  ├─ site.yml  about.md  skills.yml  projects.yml
├─ public/                 favicon, optional resume.pdf, project images
├─ scripts/
│  └─ fetch-github.ts
├─ src/
│  ├─ data/                projects.json  languages.json  meta.json  (generated, committed)
│  ├─ lib/                 types.ts  activity.ts  palette.ts  overrides.ts  store.ts  content.ts
│  ├─ scene/               Machine.tsx  Gear.tsx  gearGeometry.ts  layout.ts  links.ts  Links.tsx
│  │                       Dust.tsx  GridBackdrop.tsx  CameraRig.tsx
│  ├─ ui/                  HeroOverlay.tsx  Legend.tsx  DetailPanel.tsx  Sheet.tsx
│  │  └─ sections/         About.tsx  Skills.tsx  Contact.tsx
│  ├─ styles/              global.css  tokens.css
│  ├─ App.tsx  main.tsx
├─ docs/superpowers/specs/
├─ .github/workflows/deploy.yml
├─ index.html  vite.config.ts  tsconfig.json  package.json  vitest.config.ts
```

## 11. Testing

Vitest, pure logic only:

- `gearGeometry`: tooth count clamps; vertex count matches teeth; bounding radius ≈ outer radius.
- `layout`: deterministic for same input; every gear assigned; same-language gears share a sector; no pair closer than `rA + rB + 0.4` after relaxation.
- `links`: every cluster is connected via shafts; belts count = clusters − 1; `spinDir` alternates along every shaft edge.
- `activity`: bounds, monotonicity in stars/recency.
- `overrides`: hidden removes, title/blurb/homepage replace, featured defaults false.
- `fetch-github`: with mocked `fetch` — filters forks/archived/hidden, handles README 404, keeps old data on failure, writes the three files.

Rendering, interaction, and performance are verified manually in the browser (`pnpm dev`) at desktop and 390px widths.

## 12. Error handling

- Fetch failures never break a build when prior data exists (§7.1).
- Missing README / description / language degrade to placeholders.
- WebGL unavailable: the Machine section renders a static fallback (name, tagline, and a plain list of projects) via a `WebGL` capability check.
- Detail panel markdown is sanitised; external links open in new tabs with `rel="noopener noreferrer"`.

## 13. Deployment

`.github/workflows/deploy.yml`: on push to `main` and nightly at 03:00 UTC — checkout, pnpm install, `pnpm sync` with `GITHUB_TOKEN`, `pnpm build`, upload `dist/` to GitHub Pages. `vite.config.ts` sets `base` from `VITE_BASE` env (default `/`), so the same build works at a subpath on Pages or at root on Vercel/Netlify.
