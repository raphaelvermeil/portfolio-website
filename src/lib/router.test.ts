import { describe, expect, it } from 'vitest';
import { HOME_HREF, parseRoute, projectHref } from './router';

describe('parseRoute', () => {
  it('reads a project route', () => {
    expect(parseRoute('#/projects/ecsegames')).toEqual({ kind: 'project', id: 'ecsegames' });
  });

  it('treats the root and an empty hash as home', () => {
    expect(parseRoute('')).toEqual({ kind: 'home' });
    expect(parseRoute('#')).toEqual({ kind: 'home' });
    expect(parseRoute(HOME_HREF)).toEqual({ kind: 'home' });
    expect(parseRoute('#/')).toEqual({ kind: 'home' });
  });

  it('leaves in-page anchors as anchors, not routes', () => {
    expect(parseRoute('#about')).toEqual({ kind: 'home' });
    expect(parseRoute('#contact')).toEqual({ kind: 'home' });
  });

  it('falls back to home for anything it does not recognise', () => {
    expect(parseRoute('#/nope')).toEqual({ kind: 'home' });
    expect(parseRoute('#/projects')).toEqual({ kind: 'home' });
    expect(parseRoute('#/projects/a/b')).toEqual({ kind: 'home' });
  });

  it('tolerates a trailing slash', () => {
    expect(parseRoute('#/projects/quicklink/')).toEqual({ kind: 'project', id: 'quicklink' });
  });

  it('decodes ids that need escaping', () => {
    expect(parseRoute('#/projects/a%2Fb')).toEqual({ kind: 'project', id: 'a/b' });
  });
});

describe('projectHref', () => {
  it('round-trips through parseRoute', () => {
    for (const id of ['ecsegames', 'ecse-211-robot', 'a/b', 'spaced name']) {
      expect(parseRoute(projectHref(id))).toEqual({ kind: 'project', id });
    }
  });
});
