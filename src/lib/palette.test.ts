import { describe, expect, it } from 'vitest';
import { LANGUAGE_COLORS, OTHER_COLOR, OTHER_LANGUAGE, languageColor, languageLabel } from './palette';

describe('palette', () => {
  it('maps known languages to their colours', () => {
    expect(languageColor('TypeScript')).toBe('#4fa3ff');
    expect(languageColor('Java')).toBe('#ff8a3d');
    expect(languageColor('Jupyter Notebook')).toBe('#ffa64d');
  });

  it('falls back to the neutral colour for unknown or null', () => {
    expect(languageColor('Brainfuck')).toBe(OTHER_COLOR);
    expect(languageColor(null)).toBe(OTHER_COLOR);
  });

  it('labels null as Other', () => {
    expect(languageLabel(null)).toBe(OTHER_LANGUAGE);
    expect(languageLabel('Python')).toBe('Python');
  });

  it('has every palette entry as a 6-digit hex', () => {
    for (const hex of Object.values(LANGUAGE_COLORS)) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});
