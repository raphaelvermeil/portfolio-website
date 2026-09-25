import type { ReactNode } from 'react';

interface Props {
  id: string;
  title: string;
  number: number;
  children: ReactNode;
}

const TOTAL = 5;

export function Sheet({ id, title, number, children }: Props) {
  return (
    <section id={id} className="sheet" aria-labelledby={`${id}-title`}>
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
