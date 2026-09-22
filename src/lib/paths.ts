/** Resolves a site-relative path (e.g. "/resume.pdf") against Vite's configured base so it works on subpath deploys. */
export function withBase(path: string, base: string = import.meta.env.BASE_URL): string {
  if (!path.startsWith('/')) return path;
  return base.replace(/\/$/, '') + path;
}
