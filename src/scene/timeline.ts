import { useEffect } from 'react';

/**
 * Master scroll position through the pinned sequence, 0 to 1.
 *
 * Held in a plain ref rather than the store: it changes on every scroll frame
 * and is read inside useFrame, so routing it through React would re-render the
 * whole scene for no benefit. Components that need it as state subscribe to
 * their own scroll listener instead.
 */
export const stage = { current: 0 };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * The acts, as spans of the master timeline. They overlap on purpose: the type
 * is still clearing as the machine arrives, so the handover reads as one move
 * rather than a cut.
 */
export const ACTS = {
  /** Oversized type holds, then clears the stage. */
  typeOut: [0.03, 0.14],
  /** The cranium fades up, intact and dormant. */
  machineIn: [0.09, 0.22],
  /**
   * The reveal rotation.
   *
   * Named `upright` for continuity with the earlier designs, which stood a
   * column up here; the brain is already upright and simply turns. Renaming
   * would touch six files and buy nothing.
   *
   * It runs *before* the explode, which is the reverse of the stack. A stack
   * lying flat is an unreadable row, so it had to come apart first. An intact
   * cranium is the striking thing, so it is seen whole and turned before it
   * opens.
   */
  upright: [0.22, 0.42],
  /** Regions separate radially out of the frame, which stays put. */
  explode: [0.42, 0.64],
  /** Labels arrive as the camera finishes rising to look into the assembly. */
  scatter: [0.66, 0.9],
  /** It clears out, handing over to the about text. */
  machineOut: [0.92, 1],
} as const;

export type ActName = keyof typeof ACTS;

/** Progress within one act, 0 before it starts and 1 after it ends. */
export function actProgress(master: number, act: ActName): number {
  const [from, to] = ACTS[act];
  if (to <= from) return master >= to ? 1 : 0;
  return clamp01((master - from) / (to - from));
}

/**
 * Progress through the hero's scroll runway — the part of its height that
 * scrolls past while the sticky frame stays on screen.
 */
export function scrollStage(scrollY: number, heroHeight: number, viewportHeight: number): number {
  const runway = heroHeight - viewportHeight;
  if (runway <= 0) return 0;
  return clamp01(scrollY / runway);
}

/**
 * How far the assembly draws back together by the end of the scatter.
 *
 * Zero for the brain. The stack needed it: seen end-on, a column spread along
 * its axis as well as across it left nothing to pull away from, and the camera
 * framing all of it pushed everything small. The brain's regions fan radially
 * out of a frame that stays put, so the frame is the thing they separate from —
 * pulling them back toward it before labelling them would undo the separation
 * the labels point at.
 */
const RECOMPACT = 0;

/** Radial spread: opens through the explode and stays open. */
export function explodeAmount(master: number): number {
  return actProgress(master, 'explode') * (1 - RECOMPACT * actProgress(master, 'scatter'));
}

/**
 * Runs `apply` with the master progress on every scroll, for DOM that follows the
 * same timeline as the scene. Writes styles directly rather than through state,
 * so scrolling never re-renders the page.
 */
export function useStageEffect(heroSelector: string, apply: (master: number) => void): void {
  useEffect(() => {
    const update = () => {
      const hero = document.querySelector(heroSelector);
      apply(scrollStage(window.scrollY, hero?.clientHeight ?? 0, window.innerHeight));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [heroSelector, apply]);
}

/** Progress past which the reader has clearly started scrolling. */
const ENGAGED = 0.01;

/**
 * Drives `stage` from the page's scroll position, and reports the first real
 * scroll so the overlay can retire its hint.
 */
export function useScrollStage(heroSelector: string, onEngaged?: () => void): void {
  useEffect(() => {
    let engaged = false;
    const update = () => {
      const hero = document.querySelector(heroSelector);
      stage.current = scrollStage(window.scrollY, hero?.clientHeight ?? 0, window.innerHeight);
      if (!engaged && stage.current > ENGAGED) {
        engaged = true;
        onEngaged?.();
      }
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [heroSelector, onEngaged]);
}
