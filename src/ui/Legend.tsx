import { projects } from '../lib/data';
import { languageColor, languageLabel } from '../lib/palette';
import { useStore } from '../lib/store';

interface Entry {
  language: string;
  color: string;
  count: number;
}

const entries: Entry[] = (() => {
  const counts = new Map<string, Entry>();
  for (const p of projects) {
    const language = languageLabel(p.language);
    const e = counts.get(language) ?? { language, color: languageColor(p.language), count: 0 };
    e.count += 1;
    counts.set(language, e);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.language.localeCompare(b.language));
})();

export function Legend() {
  const filter = useStore((s) => s.filter);
  const toggleFilter = useStore((s) => s.toggleFilter);
  return (
    <ul className="legend" aria-label="Filter projects by language">
      {entries.map((e) => {
        const active = filter === e.language;
        return (
          <li key={e.language}>
            <button type="button" className={`legend__item${active ? ' is-active' : ''}`} onClick={() => toggleFilter(e.language)} aria-pressed={active}>
              <span className="legend__swatch" style={{ background: e.color }} />
              <span className="legend__name">{e.language}</span>
              <span className="legend__count">{e.count}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
