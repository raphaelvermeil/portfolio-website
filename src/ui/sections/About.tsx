import { useMemo } from 'react';
import { meta } from '../../lib/data';
import { renderMarkdown } from '../../lib/markdown';
import { aboutMarkdown, site } from '../../lib/siteContent';
import { Sheet } from '../Sheet';

export function About() {
  const html = useMemo(() => renderMarkdown(aboutMarkdown), []);
  return (
    <Sheet id="about" title="About" number={3}>
      <div className="about">
        <img className="about__avatar" src={meta.avatarUrl} alt={`${site.name}'s avatar`} width={120} height={120} loading="lazy" />
        <div className="about__text" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </Sheet>
  );
}
