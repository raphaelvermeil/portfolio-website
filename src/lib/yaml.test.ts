import { describe, expect, it } from 'vitest';
import { loadYaml } from './yaml';

describe('loadYaml', () => {
  it('returns undefined for empty and comment-only input', () => {
    expect(loadYaml('')).toBeUndefined();
    expect(loadYaml('   \n')).toBeUndefined();
    expect(loadYaml('# just a comment\n\n# another\n')).toBeUndefined();
  });

  it('parses real content', () => {
    expect(loadYaml('a: 1\n')).toEqual({ a: 1 });
    expect(loadYaml('# header\nlist: [x, y]\n')).toEqual({ list: ['x', 'y'] });
  });

  it('propagates syntax errors', () => {
    expect(() => loadYaml('a: [\n')).toThrow(/YAML|indentation/i);
  });
});
