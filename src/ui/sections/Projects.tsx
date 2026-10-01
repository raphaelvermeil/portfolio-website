import { projects } from '../../lib/data';
import { reposForLayer } from '../../lib/layerRepos';
import { languageColor, languageLabel } from '../../lib/palette';
import { projectHref } from '../../lib/router';
import { useStore } from '../../lib/store';
import { layerById } from '../../scene/assembly';
import { Sheet } from '../Sheet';

function updated(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short' });
}

/** Act 4: the stack clears and the work itself takes over, one card per repo. */
export function Projects() {
  const selected = useStore((s) => s.selected);
  const setSelected = useStore((s) => s.setSelected);
  // Selecting a layer of the stack is the filter: these are the repos that layer
  // is built from, matched on each repo's own languages and readme.
  const layer = selected ? layerById[selected] : undefined;
  const shown = layer ? reposForLayer(layer.tech, projects) : projects;

  return (
    <Sheet id="projects" title="Projects" number={2}>
      {layer && (
        <p className="filter label">
          <span className="filter__dot" style={{ background: layer.color }} aria-hidden="true" />
          <span>
            {layer.label} — {shown.length} of {projects.length}
          </span>
          <button type="button" className="filter__clear" onClick={() => setSelected(null)}>
            Show all
          </button>
        </p>
      )}
      <ul className="grid">
        {shown.map((project) => (
          <li key={project.id} className="card">
            <a className="card__link" href={projectHref(project.id)}>
              <span className="card__title">{project.title}</span>
              <span className="card__blurb">{project.blurb ?? 'No description yet.'}</span>
              <span className="card__meta label">
                <span className="card__language">
                  <span
                    className="card__dot"
                    style={{ background: languageColor(project.language) }}
                    aria-hidden="true"
                  />
                  {languageLabel(project.language)}
                </span>
                {project.stars > 0 && <span>{project.stars} ★</span>}
                <span>{updated(project.pushedAt)}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
