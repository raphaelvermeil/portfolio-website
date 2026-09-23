import { useMemo, type KeyboardEvent } from 'react';
import { projects } from '../lib/data';
import { useStore } from '../lib/store';
import { hasWebGL } from '../lib/webgl';
import { Machine } from '../scene/MachineScene';
import { placements } from '../scene/machine';
import { DetailPanel } from './DetailPanel';
import { HeroOverlay } from './HeroOverlay';

function StaticProjects() {
  return (
    <ul className="machine__fallback">
      {projects.map((p) => (
        <li key={p.id}>
          <a href={p.url} target="_blank" rel="noopener noreferrer">
            {p.title}
          </a>
          {p.language && <span className="label"> {p.language}</span>}
        </li>
      ))}
    </ul>
  );
}

const order = placements.map((p) => p.id);

let lastIndex = -1;

/** Tab cycles through gears while the stage itself is focused; leaves the section after the last one. Esc clears. */
function cycle(e: KeyboardEvent<HTMLDivElement>) {
  if (e.target !== e.currentTarget) return;
  const { selected, setSelected } = useStore.getState();
  if (e.key === 'Escape') {
    setSelected(null);
    return;
  }
  if (e.key !== 'Tab') return;
  const i = selected ? order.indexOf(selected) : lastIndex;
  const next = e.shiftKey ? i - 1 : i + 1;
  if (next < 0 || next >= order.length) {
    lastIndex = -1;
    setSelected(null);
    return;
  }
  e.preventDefault();
  lastIndex = next;
  setSelected(order[next]);
}

export function MachineSection() {
  const webgl = useMemo(hasWebGL, []);
  return (
    <section className="machine" id="projects" aria-label="Projects">
      <div className="machine__frame">
        {webgl ? (
          <div
            className="machine__stage"
            role="group"
            tabIndex={0}
            onKeyDown={cycle}
            aria-label="Exploded assembly. Press Tab to step through parts."
          >
            <Machine />
          </div>
        ) : (
          <StaticProjects />
        )}
        <HeroOverlay />
        {webgl && <DetailPanel />}
      </div>
    </section>
  );
}
