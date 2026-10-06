import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

/** Every href on an <link rel="...icon..."> tag. */
const iconHrefs = [...html.matchAll(/<link[^>]*rel="[^"]*icon[^"]*"[^>]*>/g)].map(
  (tag) => /href="([^"]+)"/.exec(tag[0])?.[1] ?? '',
);

describe('tab icons', () => {
  it('declares at least one icon', () => {
    expect(iconHrefs.length).toBeGreaterThan(0);
  });

  // A renamed asset otherwise shows up only as a blank tab in a built deploy.
  it('points every icon at a file that exists in public/', () => {
    const missing = iconHrefs.filter(
      (href) => !existsSync(new URL(`../../public${href}`, import.meta.url)),
    );
    expect(missing).toEqual([]);
  });
});
