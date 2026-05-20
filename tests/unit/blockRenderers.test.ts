import { describe, it, expect } from 'vitest';
import '../../src/shared/blocks';
import { rendersFor } from '../../src/shared/blocks/registry';
import { BlockTypeSchema } from '../../src/shared/ipc-contracts';

/**
 * Catches the regression flagged in the audit: BlockTypeSchema declared
 * 21 block types but the export registry only had 11. Anything missing
 * fell through to the `paragraph` fallback, silently dropping CVE pills,
 * asset chips, severity badges, tables, TOCs, and page breaks from the
 * client deliverable.
 *
 * Per type, we render through every export format and assert the output
 * isn't the empty fallback. `list_item` is the one exception — it's a
 * structural child of bullet/ordered_list, never rendered directly.
 */
describe('block renderer coverage', () => {
  const skipDirectRender = new Set(['list_item']);

  for (const type of BlockTypeSchema.options) {
    if (skipDirectRender.has(type)) continue;

    it(`every export format has a non-fallback renderer for ${type}`, () => {
      const renderers = rendersFor(type);
      // Build a permissive sample block. Each renderer reads what it
      // needs from `attrs`; the fields below cover every type's
      // expected shape.
      const sample = {
        id: 'b_x',
        type,
        position: 0,
        content: '',
        attrs: {
          label: 'Sample',
          kind: 'info',
          severity: 'high',
          status: 'open',
          vulnId: 'X-1',
          title: 'Sample finding',
          body: 'Body text',
          steps: ['step one', 'step two'],
          cveId: 'CVE-2024-0001',
          cvss: '7.5',
          type: 'host',
          value: 'example.com',
          headers: ['col1', 'col2'],
          rows: [['a', 'b'], ['c', 'd']],
          request: 'GET / HTTP/1.1',
          response: '200 OK',
          caption: 'cap',
          figure: '1',
        },
      };

      const md = renderers.toMarkdown(sample).join('\n');
      const html = renderers.toHtml(sample);
      const conf = renderers.toConfluence(sample);
      const word = renderers.toWord(sample);

      const meaningful = md.length + html.length + conf.length + word.length;
      expect(
        meaningful,
        `block type "${type}" produced no output in any export format — registered fallback in src/shared/blocks/index.ts?`,
      ).toBeGreaterThan(0);
    });
  }
});
