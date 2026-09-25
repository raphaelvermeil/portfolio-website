import { useEffect } from 'react';

/**
 * How far the machine is pulled apart, 0 (closed) to 1 (fully exploded).
 *
 * Held in a plain ref rather than the store: it changes on every scroll frame and
 * is only read inside useFrame, so routing it through React would re-render every
 * part for no benefit.
 */
export const explode = { current: 0 };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Progress through the hero's scroll runway — the part of its height that scrolls
 * past while the sticky frame stays on screen.
 */
export function scrollExplode(scrollY: number, heroHeight: number, viewportHeight: number): number {
  const runway = heroHeight - viewportHeight;
  if (runway <= 0) return 0;
  return clamp01(scrollY / runway);
}

/** Progress past which the reader has clearly started scrolling. */
const ENGAGED = 0.01;

/**
 * Drives `explode` from the page's scroll position through the hero section, and
 * reports the first real scroll so the overlay can retire its hint.
 */
export function useExplodeOnScroll(heroSelector: string, onEngaged?: () => void): void {
  useEffect(() => {
    let engaged = false;
    const update = () => {
      const hero = document.querySelector(heroSelector);
      explode.current = scrollExplode(window.scrollY, hero?.clientHeight ?? 0, window.innerHeight);
      if (!engaged && explode.current > ENGAGED) {
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
