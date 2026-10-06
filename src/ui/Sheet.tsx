import type { ReactNode } from 'react';

interface Props {
  id: string;
  title: string;
  number: number;
  /** Widens the frame, for a sheet whose content is a grid rather than prose. */
  wide?: boolean;
  children: ReactNode;
}

const TOTAL = 6;

export function Sheet({ id, title, number, wide = false, children }: Props) {
  return (
    <section id={id} className={`sheet${wide ? ' sheet--wide' : ''}`} aria-labelledby={`${id}-title`}>
      <div className="sheet__frame">
        <h2 id={`${id}-title`} className="sheet__title">
          {title}
        </h2>
        <div className="sheet__body">{children}</div>
        <p className="sheet__stamp label">
          Sheet {number}/{TOTAL} · {title}
        </p>
      </div>
    </section>
  );
}
