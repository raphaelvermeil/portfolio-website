import { useEffect, useRef } from 'react';
import { scrollExplode } from '../scene/explode';

/**
 * Ruler showing how far the machine has come apart. Written straight to the DOM
 * on scroll rather than through state, so it never re-renders the page.
 */
export function Scrubber() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const update = () => {
      const hero = document.querySelector('.machine');
      const progress = scrollExplode(window.scrollY, hero?.clientHeight ?? 0, window.innerHeight);
      if (marker.current) marker.current.style.insetInlineStart = `${progress * 100}%`;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="scrubber" aria-hidden="true">
      <span className="scrubber__track" />
      <span ref={marker} className="scrubber__marker" />
    </div>
  );
}
