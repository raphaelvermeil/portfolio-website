import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { countWords, numberWords, revealAmount, sectionProgress } from '../../lib/reveal';
import { aboutMarkdown } from '../../lib/siteContent';

/**
 * The about text, inked in as the reader scrolls.
 *
 * Words are written straight to the DOM on scroll rather than through state:
 * there are a couple of hundred of them and they change on every frame of the
 * scroll, so re-rendering would be the whole cost of the section.
 */
export function About() {
  const section = useRef<HTMLElement>(null);
  const words = useRef<HTMLSpanElement[]>([]);

  const paragraphs = useMemo(() => numberWords(aboutMarkdown), []);
  const total = useMemo(() => countWords(aboutMarkdown), []);

  const paint = useCallback(() => {
    const node = section.current;
    if (!node) return;
    const { top, height } = node.getBoundingClientRect();
    const progress = sectionProgress(top, height, window.innerHeight);
    for (let i = 0; i < words.current.length; i++) {
      const span = words.current[i];
      if (span) span.style.setProperty('--lit', String(revealAmount(progress, i, total)));
    }
  }, [total]);

  useLayoutEffect(() => {
    paint();
    window.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', paint);
    return () => {
      window.removeEventListener('scroll', paint);
      window.removeEventListener('resize', paint);
    };
  }, [paint]);

  return (
    <section className="reveal" id="about" ref={section} aria-label="About">
      <div className="reveal__frame">
        <div className="reveal__text">
          {paragraphs.map((paragraph, p) => (
            <p key={p}>
              {paragraph.map(({ word, index }) => (
                <span
                  key={index}
                  className="reveal__word"
                  ref={(el) => {
                    if (el) words.current[index] = el;
                  }}
                >
                  {word}{' '}
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
