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
  /** The machine fades up into the space the type leaves. */
  machineIn: [0.09, 0.22],
  /** Seen from the side, it comes apart along its axis. */
  explode: [0.18, 0.46],
  /**
   * Only once the camera has finished climbing do the labelled parts step off
   * the axis, so the separation is read from above rather than edge-on. The
   * stretch between this and the explode is the climb itself.
   */
  scatter: [0.62, 0.88],
  /** It clears out, handing over to the project grid. */
  machineOut: [0.9, 1],
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
 * How far the stack has drawn back together by the end of the scatter.
 *
 * Seen end-on the machine should read as one compact column with a few parts
 * pulled clear of it. Left spread along its axis as well as across it, there is
 * no column left to pull away from — just a field of parts — and the camera,
 * which has to frame all of it, pushes the whole thing small.
 */
const RECOMPACT = 0.82;

/** Axial spread: opens through the explode, then eases back during the scatter. */
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
