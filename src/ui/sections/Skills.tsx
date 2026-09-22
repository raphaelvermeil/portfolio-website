import { languageBytes } from '../../lib/data';
import { languageColor } from '../../lib/palette';
import { skills } from '../../lib/siteContent';
import { Sheet } from '../Sheet';

const MIN_SHARE = 0.01;

const bar = (() => {
  const total = Object.values(languageBytes).reduce((s, b) => s + b, 0);
  return Object.entries(languageBytes)
    .map(([language, bytes]) => ({ language, share: total ? bytes / total : 0 }))
    .filter((e) => e.share >= MIN_SHARE)
    .sort((a, b) => b.share - a.share);
})();

export function Skills() {
  return (
    <Sheet id="skills" title="Skills" number={3}>
      <p className="label">Languages by bytes across public repos</p>
      <div className="langbar" role="img" aria-label={bar.map((e) => `${e.language} ${Math.round(e.share * 100)}%`).join(', ')}>
        {bar.map((e) => (
          <span key={e.language} className="langbar__seg" style={{ width: `${e.share * 100}%`, background: languageColor(e.language) }} title={`${e.language} ${Math.round(e.share * 100)}%`} />
        ))}
      </div>
      <ul className="langbar__legend">
        {bar.map((e) => (
          <li key={e.language}>
            <span className="legend__swatch" style={{ background: languageColor(e.language) }} /> {e.language} <span className="legend__count">{Math.round(e.share * 100)}%</span>
          </li>
        ))}
      </ul>
      <div className="skills">
        {skills.map((g) => (
          <div key={g.group} className="skills__group">
            <p className="label">{g.group}</p>
            <ul>
              {g.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
