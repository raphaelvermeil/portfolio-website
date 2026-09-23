/**
 * Scene colours. These mirror the CSS custom properties in styles/tokens.css —
 * WebGL materials cannot read them, so the two must be changed together.
 */
export const BACKGROUND = '#d9d7d2';
export const INK = '#56544f';
export const INK_DIM = '#b6b4af';
export const ACCENT = '#d8453a';

/**
 * Edges are drawn only where faces meet at more than this angle: above the 10°
 * facets of a revolved surface, below the profile steps, tooth flanks and box
 * corners that define a part's silhouette.
 */
export const EDGE_THRESHOLD_DEG = 24;
