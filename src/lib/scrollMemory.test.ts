import { describe, expect, it } from 'vitest';
import { createScrollMemory, routeKey } from './scrollMemory';

describe('routeKey', () => {
  it('separates home from each project', () => {
    expect(routeKey({ kind: 'home' })).toBe('home');
    expect(routeKey({ kind: 'project', id: 'quicklink' })).toBe('project:quicklink');
  });

  it('gives different projects different keys', () => {
    expect(routeKey({ kind: 'project', id: 'a' })).not.toBe(routeKey({ kind: 'project', id: 'b' }));
  });
});

describe('createScrollMemory', () => {
  it('returns the top for a route it has never seen', () => {
    expect(createScrollMemory().recall('home')).toBe(0);
  });

  it('gives back what was saved, per route', () => {
    const memory = createScrollMemory();
    memory.save('home', 4200);
    memory.save('project:a', 120);
    expect(memory.recall('home')).toBe(4200);
    expect(memory.recall('project:a')).toBe(120);
  });

  it('keeps only the latest position for a route', () => {
    const memory = createScrollMemory();
    memory.save('home', 100);
    memory.save('home', 900);
    expect(memory.recall('home')).toBe(900);
  });

  it('never recalls a negative offset, whatever a rubber-banding browser reported', () => {
    const memory = createScrollMemory();
    memory.save('home', -80);
    expect(memory.recall('home')).toBe(0);
  });
});
