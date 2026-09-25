import { languageBytes } from './data';
import { languageColor } from './palette';

export interface SkillShare {
  language: string;
  color: string;
  /** Fraction of all committed bytes, 0 to 1. */
  share: number;
}

/** Languages below this are folded away rather than shown as slivers. */
const MIN_SHARE = 0.01;

/** Languages by share of bytes across the public repos, largest first. */
export function skillShares(bytes: Record<string, number> = languageBytes): SkillShare[] {
  const total = Object.values(bytes).reduce((sum, b) => sum + b, 0);
  if (total === 0) return [];
  return Object.entries(bytes)
    .map(([language, b]) => ({ language, color: languageColor(language), share: b / total }))
    .filter((s) => s.share >= MIN_SHARE)
    .sort((a, b) => b.share - a.share || a.language.localeCompare(b.language));
}

export const percent = (share: number) => `${Math.round(share * 100)}%`;
