import type { Route } from './router';

/** Identifies a route for the purpose of remembering where it was scrolled to. */
export function routeKey(route: Route): string {
  return route.kind === 'project' ? `project:${route.id}` : 'home';
}

export interface ScrollMemory {
  /** Records where a route is currently scrolled to. */
  save(key: string, offset: number): void;
  /** Where to put a route when returning to it; the top if never visited. */
  recall(key: string): number;
}

export function createScrollMemory(): ScrollMemory {
  const offsets = new Map<string, number>();
  return {
    save(key, offset) {
      offsets.set(key, Math.max(0, offset));
    },
    recall(key) {
      return offsets.get(key) ?? 0;
    },
  };
}
