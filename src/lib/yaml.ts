import { load } from 'js-yaml';

/** Returns undefined for blank or comment-only text; otherwise parses with js-yaml, letting syntax errors propagate. */
export function loadYaml(text: string): unknown {
  const hasContent = /^\s*[^#\s]/m.test(text);
  if (!hasContent) return undefined;
  return load(text);
}
