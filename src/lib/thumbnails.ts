/**
 * Thumbnails dropped in by hand.
 *
 * `thumbnails/<repo name>/` holds at most one image, under any filename, and
 * that image becomes the repo's thumbnail. Vite hashes and emits whatever is
 * there, so adding a file is the whole operation — no path to type into
 * content/projects.yml, and no stale URL left behind when it is replaced.
 */

import type { Project } from './types';

/** Strips Vite's base back off an emitted asset url, since withBase puts it on again at render. */
function stripBase(url: string, base: string): string {
  return base !== '/' && url.startsWith(base) ? url.slice(base.length - 1) : url;
}

/** Picks one image per folder out of a glob of `thumbnails/<repo>/<file>`, keyed by repo name. */
export function thumbnailMap(globbed: Record<string, string>, base: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Sorted, so where a folder holds several images the first one wins and the
  // choice does not drift between builds.
  for (const path of Object.keys(globbed).sort()) {
    const folder = /\/thumbnails\/([^/]+)\/[^/]+$/.exec(path)?.[1];
    if (!folder || folder in out) continue;
    out[folder] = stripBase(globbed[path], base);
  }
  return out;
}

const files = import.meta.glob('../../thumbnails/*/*.{png,jpg,jpeg,webp,avif,gif,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Repo name → thumbnail url, for every folder that has an image in it. */
export const thumbnails = thumbnailMap(files, import.meta.env.BASE_URL);

/** Replaces a project's image with its dropped-in thumbnail, where there is one. */
export function withThumbnail(project: Project, map: Record<string, string> = thumbnails): Project {
  const url = map[project.id];
  return url ? { ...project, image: url } : project;
}
