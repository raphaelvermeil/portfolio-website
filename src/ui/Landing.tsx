import { type MouseEvent } from 'react';
import { meta } from '../lib/data';
import { site } from '../lib/siteContent';

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

/**
 * The landing: oversized type, one viewport tall, and then the reader scrolls
 * past it. It no longer drives anything — the passage below owns its own
 * scroll — so it is static markup.
 */
export function Landing() {
  const year = new Date(meta.fetchedAt).getFullYear();

  return (
    <section className="landing" id="top" aria-label="Introduction">
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

      <div className="titlecard">
        <p className="titlecard__name label">{site.name}</p>
        <h1 className="titlecard__role">{site.role}</h1>
        <img
          className="titlecard__portrait"
          src={meta.avatarUrl}
          alt={site.name}
          width={150}
          height={150}
          loading="eager"
        />
        <p className="titlecard__mark titlecard__mark--left">©{year}</p>
        <p className="titlecard__mark titlecard__mark--right">/{site.tagline}</p>
      </div>
    </section>
  );
}
