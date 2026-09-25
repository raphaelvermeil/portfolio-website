import { useCallback, useRef } from 'react';
import { meta } from '../lib/data';
import { useStore } from '../lib/store';
import { actProgress, useStageEffect } from '../scene/timeline';
import { Legend } from './Legend';
import { Scrubber } from './Scrubber';

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
        <a href="#about">About</a>
        <a href="#skills">Skills</a>
        <a href="#contact">Contact</a>
        <a href={meta.profileUrl} target="_blank" rel="noopener noreferrer">
          GitHub ↗
        </a>
      </nav>
      <div className="hero__chrome" ref={chrome}>
        <div className="hero__legend">
          <Legend />
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
