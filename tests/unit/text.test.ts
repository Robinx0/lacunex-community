import { describe, it, expect } from 'vitest';
import {
  extractTiptapText,
  escapeHtml,
  escapeXml,
  slugify,
  djb2,
} from '../../src/shared/util/text';

describe('shared/util/text', () => {
  it('extractTiptapText handles paragraph + heading + nested marks', () => {
    expect(
      extractTiptapText(
        '{"type":"paragraph","content":[{"type":"text","text":"Hello "},{"type":"text","marks":[{"type":"bold"}],"text":"world"}]}',
      ),
    ).toBe('Hello world');
    expect(extractTiptapText('')).toBe('');
    expect(extractTiptapText(undefined)).toBe('');
    expect(extractTiptapText('not-json')).toBe('not-json');
  });

  it('extractTiptapText recurses through nested content (lists)', () => {
    const json = JSON.stringify({
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'one' }] },
          ],
        },
        {
          type: 'listItem',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'two' }] },
          ],
        },
      ],
    });
    expect(extractTiptapText(json)).toBe('onetwo');
  });

  it('escapeHtml handles all 5 HTML metachars', () => {
    expect(escapeHtml('<a href="x" target=\'_blank\'>&hi</a>')).toBe(
      '&lt;a href=&quot;x&quot; target=&#39;_blank&#39;&gt;&amp;hi&lt;/a&gt;',
    );
  });

  it('escapeXml omits apostrophe (XML legal in attrs)', () => {
    expect(escapeXml("a&b<c>\"")).toBe('a&amp;b&lt;c&gt;&quot;');
  });

  it('slugify handles emoji + diacritics + empty', () => {
    expect(slugify('Acme Corp — External Test #1')).toBe('acme-corp-external-test-1');
    expect(slugify('  ---  ')).toBe('untitled');
    expect(slugify('')).toBe('untitled');
    expect(slugify('a'.repeat(200), 16)).toHaveLength(16);
  });

  it('djb2 returns a stable base36 string', () => {
    const a = djb2('hello world');
    const b = djb2('hello world');
    const c = djb2('hello world!');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-z]+$/);
  });
});
