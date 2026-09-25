import { percent, skillShares } from '../lib/skills';

const shares = skillShares();

/**
 * The machine's read-out: what the work is actually made of, as one stacked bar.
 * Shown while the machine holds the stage, alongside the parts it describes.
 */
export function SkillsPanel() {
  if (shares.length === 0) return null;

  return (
    <div className="readout">
      <p className="readout__head">
        <span>Built with</span>
        <span className="readout__total">{shares.length} languages</span>
      </p>
      <div
        className="readout__bar"
        role="img"
        aria-label={shares.map((s) => `${s.language} ${percent(s.share)}`).join(', ')}
      >
        {shares.map((s) => (
          <span key={s.language} style={{ width: `${s.share * 100}%`, background: s.color }} />
        ))}
      </div>
      <ul className="readout__keys">
        {shares.map((s) => (
          <li key={s.language}>
            <span className="readout__dot" style={{ background: s.color }} aria-hidden="true" />
            {s.language}
            <span className="readout__share">{percent(s.share)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
