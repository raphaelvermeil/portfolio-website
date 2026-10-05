import { projects } from '../../lib/data';
import { languageColor, languageLabel } from '../../lib/palette';
import { projectHref } from '../../lib/router';
import { Sheet } from '../Sheet';
import { Thumbnail } from '../Thumbnail';

function updated(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short' });
}

/** Act 4: the stack clears and the work itself takes over, one card per repo. */
export function Projects() {
  return (
    <Sheet id="projects" title="Projects" number={2} wide>
      <ul className="grid">
        {projects.map((project) => (
          <li key={project.id} className="card">
            <a className="card__link" href={projectHref(project.id)}>
              <Thumbnail id={project.id} image={project.image} title={project.title} />
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
