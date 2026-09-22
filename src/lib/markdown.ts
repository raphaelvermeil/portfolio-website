import DOMPurify from 'dompurify';
import { marked } from 'marked';

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false, gfm: true });
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ['target'] });
}
