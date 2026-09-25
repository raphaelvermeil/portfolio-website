import { useEffect, useMemo } from 'react';
import { projectById } from '../lib/data';
import { withBase } from '../lib/paths';
import { renderMarkdown } from '../lib/markdown';
import { languageLabel } from '../lib/palette';
import { HOME_HREF } from '../lib/router';
import { site } from '../lib/siteContent';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: '2-digit' });
}

function NotFound({ id }: { id: string }) {
  return (
    <main className="article">
      <a className="article__back" href={HOME_HREF}>
        ← {site.name}
      </a>
      <h1 className="article__title">Not found</h1>
      <p className="article__blurb">There is no project called “{id}”.</p>
    </main>
  );
}

/** A single project as its own page, so it can be linked to and read on its own. */
export function ProjectPage({ id }: { id: string }) {
  const project = projectById[id];

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = project ? `${project.title} — ${site.name}` : `Not found — ${site.name}`;
    return () => {
      document.title = site.name;
    };
  }, [project]);

  const body = useMemo(() => (project?.readme ? renderMarkdown(project.readme) : null), [project]);

  if (!project) return <NotFound id={id} />;

  return (
    <main className="article">
      <a className="article__back" href={HOME_HREF}>
        ← {site.name}
      </a>

      <header className="article__head">
        <h1 className="article__title">{project.title}</h1>
        <p className="article__blurb">{project.blurb ?? 'No description yet.'}</p>
      </header>

      <table className="panel__block article__facts">
        <tbody>
          <tr>
            <th>Language</th>
            <td>{languageLabel(project.language)}</td>
          </tr>
          <tr>
            <th>Stars</th>
            <td>{project.stars}</td>
          </tr>
          <tr>
            <th>Updated</th>
            <td>{formatDate(project.pushedAt)}</td>
          </tr>
          <tr>
            <th>Topics</th>
            <td>{project.topics.length ? project.topics.join(', ') : '—'}</td>
          </tr>
        </tbody>
      </table>

      <div className="article__actions">
        <a className="button" href={project.url} target="_blank" rel="noopener noreferrer">
          Open on GitHub ↗
        </a>
        {project.homepage && (
          <a className="button button--ghost" href={project.homepage} target="_blank" rel="noopener noreferrer">
            Live demo ↗
          </a>
        )}
      </div>

      {project.image && <img className="article__image" src={withBase(project.image)} alt="" />}

      {body ? (
        <div className="article__body" dangerouslySetInnerHTML={{ __html: body }} />
      ) : (
        <p className="article__empty label">This repository has no README yet.</p>
      )}
    </main>
  );
}
