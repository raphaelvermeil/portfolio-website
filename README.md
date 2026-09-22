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

`.github/workflows/deploy.yml` builds nightly and on every push to `main`, then publishes `dist/` to GitHub Pages (enable Pages → Source: GitHub Actions in the repo settings). The `VITE_BASE` env sets the URL base; leave it unset for a root deploy on Vercel/Netlify. For a user site (`<user>.github.io` repo) set `VITE_BASE=/` instead.
