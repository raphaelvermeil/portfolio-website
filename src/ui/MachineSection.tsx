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

/** Tab cycles through gears while the stage itself is focused; leaves the section after the last one. */
function cycle(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== 'Tab' || e.target !== e.currentTarget) return;
  const { selected, setSelected } = useStore.getState();
  const i = selected ? order.indexOf(selected) : -1;
  const next = e.shiftKey ? i - 1 : i + 1;
  if (next < 0 || next >= order.length) {
    setSelected(null);
    return;
  }
  e.preventDefault();
  setSelected(order[next]);
}

export function MachineSection() {
  const webgl = useMemo(hasWebGL, []);
  return (
    <section className="machine" id="projects" aria-label="Projects">
      {webgl ? (
        <div className="machine__stage" tabIndex={0} onKeyDown={cycle} aria-label="Project constellation. Press Tab to step through projects.">
          <Machine />
        </div>
      ) : (
        <StaticProjects />
      )}
      <HeroOverlay />
      {webgl && <DetailPanel />}
    </section>
  );
}
