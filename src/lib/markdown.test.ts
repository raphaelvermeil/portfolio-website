// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders headings, paragraphs and code', () => {
    const html = renderMarkdown('# Title\n\nSome `code` here.');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<code>code</code>');
  });

  it('strips scripts and event handlers', () => {
    const html = renderMarkdown('<script>alert(1)</script><img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
  });

  it('opens links in a new tab safely', () => {
    const html = renderMarkdown('[gh](https://github.com)');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
