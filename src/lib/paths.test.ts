import { describe, expect, it } from 'vitest';
import { withBase } from './paths';

describe('withBase', () => {
  it('prefixes site-relative paths with the base', () => {
    expect(withBase('/resume.pdf', '/portfolio/')).toBe('/portfolio/resume.pdf');
    expect(withBase('/img/a.png', '/')).toBe('/img/a.png');
  });

  it('leaves relative and absolute URLs alone', () => {
    expect(withBase('resume.pdf', '/portfolio/')).toBe('resume.pdf');
    expect(withBase('https://example.com/x.pdf', '/portfolio/')).toBe('https://example.com/x.pdf');
  });
});
