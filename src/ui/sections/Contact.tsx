import { meta } from '../../lib/data';
import { site } from '../../lib/siteContent';
import { Sheet } from '../Sheet';

export function Contact() {
  const rows: { label: string; href: string; text: string }[] = [
    { label: 'Email', href: `mailto:${site.email}`, text: site.email },
    { label: 'GitHub', href: meta.profileUrl, text: `github.com/${site.github}` },
  ];
  if (site.linkedin) rows.push({ label: 'LinkedIn', href: site.linkedin, text: site.linkedin.replace(/^https?:\/\//, '') });
  if (site.resume) rows.push({ label: 'Resume', href: site.resume, text: 'Download PDF' });
  return (
    <Sheet id="contact" title="Contact" number={4}>
      <table className="panel__block contact">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th>{r.label}</th>
              <td>
                <a href={r.href} target={r.href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer">
                  {r.text}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Sheet>
  );
}
