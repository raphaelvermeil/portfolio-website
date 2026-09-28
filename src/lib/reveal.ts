const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Share of the scroll that any one word spends part-lit. */
export const SOFTNESS = 0.14;

/**
 * How far one word has been revealed, 0 (still grey) to 1 (fully inked).
 *
 * Words light in reading order as the reader scrolls. `softness` is how much of
 * the whole scroll a single word takes to turn, so a band of words is always
 * mid-transition rather than one flicking over at a time.
 */
export function revealAmount(
  progress: number,
  index: number,
  total: number,
  softness = SOFTNESS,
): number {
  if (total <= 0) return 0;
  const span = Math.min(1, Math.max(1e-6, softness));
  // Squeezed so the last word still finishes exactly as the scroll runs out.
  const start = (index / total) * (1 - span);
  return clamp01((progress - start) / span);
}

/**
 * How far a tall section has travelled through its own scroll, 0 when its top
 * reaches the top of the viewport to 1 when its bottom does.
 */
export function sectionProgress(top: number, height: number, viewportHeight: number): number {
  const runway = height - viewportHeight;
  if (runway <= 0) return top <= 0 ? 1 : 0;
  return clamp01(-top / runway);
}

export interface RevealWord {
  word: string;
  /** Position in the whole passage, so numbering runs on across paragraphs. */
  index: number;
}

/** Splits prose into paragraphs of words, numbered continuously for the reveal. */
export function numberWords(text: string): RevealWord[][] {
  let index = 0;
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) =>
      paragraph
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => ({ word, index: index++ })),
    );
}

/** Total number of words the reveal will step through. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
