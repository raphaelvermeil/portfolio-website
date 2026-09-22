import { useMemo } from 'react';
import { projects } from '../lib/data';
import { hasWebGL } from '../lib/webgl';
import { Machine } from '../scene/MachineScene';
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

export function MachineSection() {
  const webgl = useMemo(hasWebGL, []);
  return (
    <section className="machine" id="projects" aria-label="Projects">
      {webgl ? <Machine /> : <StaticProjects />}
      <HeroOverlay />
    </section>
  );
}
