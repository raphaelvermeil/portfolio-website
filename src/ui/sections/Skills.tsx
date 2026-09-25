import { skills } from '../../lib/siteContent';
import { Sheet } from '../Sheet';

/**
 * Tools, not languages: the language breakdown is the machine's read-out now,
 * so repeating it here would say the same thing twice.
 */
export function Skills() {
  return (
    <Sheet id="skills" title="Skills" number={4}>
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
