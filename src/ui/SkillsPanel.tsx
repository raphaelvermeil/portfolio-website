import { projects } from '../lib/data';
import { layerCounts } from '../lib/layerRepos';
import { ASSEMBLY } from '../scene/assembly';

/** Top of the stack first, the way the drawing reads. */
const layers = [...ASSEMBLY].reverse();
const counts = layerCounts(ASSEMBLY, projects);

/**
 * The stack's read-out: what each layer is, and how many repos are built on it.
 *
 * The count is the honest number — repos matched on their own languages and
 * readme — rather than a share of bytes. Bytes flatter whatever language checks
 * in the largest files, which on this account is one notebook repo carrying its
 * plot images.
 */
export function SkillsPanel() {
  if (layers.length === 0) return null;

  return (
    <div className="readout">
      <p className="readout__head">
        <span>The stack</span>
        <span className="readout__total">{layers.length} layers</span>
      </p>
      <ul className="readout__keys readout__keys--rows">
        {layers.map((layer) => (
          <li key={layer.id}>
            <span className="readout__dot" style={{ background: layer.color }} aria-hidden="true" />
            {layer.label}
            <span className="readout__tech">{layer.tech.join(' · ')}</span>
            <span className="readout__share">{counts[layer.id]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
