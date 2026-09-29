import { useCallback, useRef, type MouseEvent } from 'react';
import { meta } from '../lib/data';
import { useStore } from '../lib/store';
import { actProgress, useStageEffect } from '../scene/timeline';
import { SkillsPanel } from './SkillsPanel';
import { Scrubber } from './Scrubber';

/**
 * Scrolls to a section without touching the hash: the hash is the router's, and
 * a fragment there would read as a route change. Smooth here rather than in CSS,
 * so restoring a remembered position stays instant.
 */
const jumpTo = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export function HeroOverlay() {
  const hasInteracted = useStore((s) => s.hasInteracted);
  const rev = meta.fetchedAt.slice(0, 10);
  const chrome = useRef<HTMLDivElement>(null);

  /** The machine's instruments belong to the machine, not to the landing. */
  const fade = useCallback((master: number) => {
    const node = chrome.current;
    if (!node) return;
    const visible = actProgress(master, 'machineIn') * (1 - actProgress(master, 'machineOut'));
    node.style.opacity = String(visible);
    node.style.visibility = visible < 0.02 ? 'hidden' : 'visible';
  }, []);

  useStageEffect('.machine', fade);

  return (
    <div className="hero">
      <nav className="hero__nav" aria-label="Sections">
        <a href="#projects" onClick={jumpTo('projects')}>
          Work
        </a>
        <a href="#about" onClick={jumpTo('about')}>
          About
        </a>
        <a href="#skills" onClick={jumpTo('skills')}>
          Skills
        </a>
        <a href="#contact" onClick={jumpTo('contact')}>
          Contact
        </a>
        <a href={meta.profileUrl} target="_blank" rel="noopener noreferrer">
          GitHub ↗
        </a>
      </nav>
      <div className="hero__chrome" ref={chrome}>
        <div className="hero__readout">
          <SkillsPanel />
        </div>
        <div className="hero__corner">
          <p className={`hero__hint${hasInteracted ? ' is-hidden' : ''}`} aria-hidden={hasInteracted}>
            scroll to run the machine · click a part
          </p>
          <Scrubber />
          <p className="hero__stamp label">Sheet 1/4 · Rev {rev}</p>
        </div>
      </div>
    </div>
  );
}
