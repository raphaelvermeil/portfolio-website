export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#4fa3ff',
  JavaScript: '#ffd54a',
  Java: '#ff8a3d',
  Python: '#5fd67a',
  HTML: '#ff6b6b',
  CSS: '#c58cff',
  'Jupyter Notebook': '#ffa64d',
  Ruby: '#ff4f6d',
  C: '#8fb3ff',
  'C++': '#8fb3ff',
};

export const OTHER_COLOR = '#9aa5b8';
export const OTHER_LANGUAGE = 'Other';

export function languageLabel(lang: string | null): string {
  return lang ?? OTHER_LANGUAGE;
}

export function languageColor(lang: string | null): string {
  if (lang === null) return OTHER_COLOR;
  return LANGUAGE_COLORS[lang] ?? OTHER_COLOR;
}
