import { useEffect, useState } from 'react';

export type Route = { kind: 'home' } | { kind: 'project'; id: string };

/**
 * Hash routing, so the site stays a static file that works under any path — a
 * project subdirectory on GitHub Pages included — with no server rewrites.
 *
 * Only hashes that begin with `#/` are routes. Plain fragments like `#about`
 * are left alone so in-page anchors keep scrolling as normal anchors.
 */
export function parseRoute(hash: string): Route {
  if (!hash.startsWith('#/')) return { kind: 'home' };
  const segments = hash
    .slice(2)
    .split('/')
    .filter((s) => s.length > 0)
    .map(decodeURIComponent);

  if (segments.length === 2 && segments[0] === 'projects') {
    return { kind: 'project', id: segments[1] };
  }
  return { kind: 'home' };
}

export function projectHref(id: string): string {
  return `#/projects/${encodeURIComponent(id)}`;
}

export const HOME_HREF = '#/';

/** The current route, kept in step with the address bar and the back button. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(typeof window === 'undefined' ? '' : window.location.hash),
  );

  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.hash));
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  return route;
}
