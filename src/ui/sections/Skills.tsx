import { skills } from '../../lib/siteContent';
import { Sheet } from '../Sheet';

/**
 * Tools, not layers: the stack's read-out already names what each layer of the
 * architecture is built from, so repeating those here would say the same thing
 * twice. This is the rest — what does not belong to one layer.
 */
export function Skills() {
  return (
    <Sheet id="skills" title="Skills" number={5}>
      <div className="skills">
        {skills.map((group) => (
          <div key={group.group} className="skills__group">
            <p className="label">{group.group}</p>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
