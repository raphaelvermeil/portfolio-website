import { useEffect, useMemo, useRef } from 'react';
import { projectById } from '../lib/data';
import { renderMarkdown } from '../lib/markdown';
import { languageLabel } from '../lib/palette';
import { withBase } from '../lib/paths';
import { useStore } from '../lib/store';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: '2-digit' });
}

export function DetailPanel() {
  const selected = useStore((s) => s.selected);
  const setSelected = useStore((s) => s.setSelected);
  const project = selected ? projectById[selected] : null;
  const panel = useRef<HTMLElement>(null);
  const readme = useMemo(() => (project?.readmeExcerpt ? renderMarkdown(project.readmeExcerpt) : null), [project]);

  useEffect(() => {
    if (!project) return;
    const el = panel.current;
    const previous = document.activeElement as HTMLElement | null;
    const openedFromStage = previous?.classList.contains('machine__stage') ?? false;
    if (!openedFromStage) el?.querySelector<HTMLElement>('.panel__close')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelected(null);
        return;
      }
      if (e.key === 'Tab' && el) {
        const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        e.stopPropagation();
      }
    };
    el?.addEventListener('keydown', onKey);
    return () => {
      el?.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [project, setSelected]);

  return (
    <aside ref={panel} className={`panel${project ? ' is-open' : ''}`} aria-hidden={!project} aria-label="Project details">
      {project && (
        <>
          <button type="button" className="panel__close" onClick={() => setSelected(null)} aria-label="Close">
            ✕
          </button>
          <table className="panel__block">
            <tbody>
              <tr>
                <th>Name</th>
                <td>{project.title}</td>
              </tr>
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
          <p className="panel__blurb">{project.blurb ?? 'No description yet.'}</p>
          <div className="panel__actions">
            <a className="button" href={project.url} target="_blank" rel="noopener noreferrer">
              Open on GitHub ↗
            </a>
            {project.homepage && (
              <a className="button button--ghost" href={project.homepage} target="_blank" rel="noopener noreferrer">
                Live demo ↗
              </a>
            )}
          </div>
          {project.image && <img className="panel__image" src={withBase(project.image)} alt="" />}
          {readme && (
            <section className="panel__readme">
              <p className="label">README</p>
              <div className="panel__markdown" dangerouslySetInnerHTML={{ __html: readme }} />
            </section>
          )}
        </>
      )}
    </aside>
  );
}
