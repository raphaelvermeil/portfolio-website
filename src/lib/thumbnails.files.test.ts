import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import projectsJson from '../data/projects.json';

const folders = readdirSync(new URL('../../thumbnails', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe('thumbnails folders', () => {
  it('has a folder to drop an image into', () => {
    expect(folders.length).toBeGreaterThan(0);
  });

  // A misnamed folder is otherwise silent: the image just never appears.
  it('names every folder after a real repo', () => {
    const ids = new Set(projectsJson.map((p) => p.id));
    expect(folders.filter((name) => !ids.has(name))).toEqual([]);
  });
});
