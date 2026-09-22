import { meta } from '../lib/data';
import { site } from '../lib/siteContent';
import { useStore } from '../lib/store';
import { Legend } from './Legend';

export function HeroOverlay() {
  const hasInteracted = useStore((s) => s.hasInteracted);
  const rev = meta.fetchedAt.slice(0, 10);
  return (
    <div className="hero">
      <header className="hero__head">
        <h1 className="hero__name">{site.name}</h1>
        <p className="hero__tagline">{site.tagline}</p>
      </header>
      <nav className="hero__nav" aria-label="Sections">
        <a href="#about">About</a>
        <a href="#skills">Skills</a>
        <a href="#contact">Contact</a>
        <a href={meta.profileUrl} target="_blank" rel="noopener noreferrer">
          GitHub ↗
        </a>
      </nav>
      <div className="hero__legend">
        <Legend />
      </div>
      <div className="hero__corner">
        <p className={`hero__hint${hasInteracted ? ' is-hidden' : ''}`} aria-hidden={hasInteracted}>
          drag to orbit · click a gear
        </p>
        <p className="hero__stamp label">
          Sheet 1/4 · Rev {rev}
        </p>
      </div>
    </div>
  );
}
