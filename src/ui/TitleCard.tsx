import { useCallback, useRef } from 'react';
import { meta } from '../lib/data';
import { site } from '../lib/siteContent';
import { actProgress, useStageEffect } from '../scene/timeline';

/** How far the type drifts up as it clears, in viewport heights. */
const LIFT = 0.12;
const SHRINK = 0.14;

/**
 * The landing: oversized type that holds the stage, then clears as the machine
 * arrives. It is driven off the same scroll timeline as the scene, writing
 * transforms straight to the node so scrolling never re-renders.
 */
export function TitleCard() {
  const root = useRef<HTMLDivElement>(null);

  const apply = useCallback((master: number) => {
    const out = actProgress(master, 'typeOut');
    const node = root.current;
    if (!node) return;
    node.style.opacity = String(1 - out);
    node.style.transform = `translateY(${-LIFT * out * 100}vh) scale(${1 - SHRINK * out})`;
    // Once clear it must not swallow clicks meant for the machine.
    node.style.visibility = out >= 1 ? 'hidden' : 'visible';
  }, []);

  useStageEffect('.machine', apply);

  const year = new Date(meta.fetchedAt).getFullYear();

  return (
    <div className="titlecard" ref={root}>
      <p className="titlecard__name label">{site.name}</p>
      <h1 className="titlecard__role">{site.role}</h1>
      <img
        className="titlecard__portrait"
        src={meta.avatarUrl}
        alt={`${site.name}`}
        width={150}
        height={150}
        loading="eager"
      />
      <p className="titlecard__mark titlecard__mark--left">©{year}</p>
      <p className="titlecard__mark titlecard__mark--right">/{site.tagline}</p>
    </div>
  );
}
