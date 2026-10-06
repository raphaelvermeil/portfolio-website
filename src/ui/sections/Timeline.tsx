import type { TimelineEntry } from '../../lib/content';
import { Sheet } from '../Sheet';

interface Props {
  id: string;
  title: string;
  number: number;
  entries: TimelineEntry[];
}

/**
 * A dated list, used for both jobs and schooling: the two read identically —
 * when, what, where — so they share one component rather than two near-copies.
 */
export function Timeline({ id, title, number, entries }: Props) {
  return (
    <Sheet id={id} title={title} number={number}>
      <ol className="timeline">
        {entries.map((entry) => (
          <li key={`${entry.org}-${entry.dates}`} className="timeline__entry">
            <p className="timeline__dates label">{entry.dates}</p>
            <div className="timeline__body">
              <h3 className="timeline__title">{entry.title}</h3>
              <p className="timeline__org">
                {entry.org}
                {entry.location && <span className="timeline__where"> · {entry.location}</span>}
              </p>
              {entry.detail && <p className="timeline__detail">{entry.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}
