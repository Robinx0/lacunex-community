import { Paragraph, TextRun } from 'docx';
import { registerBlockRenderers } from './registry';
import { escapeHtml } from './_helpers';

const req = (block: { attrs?: Record<string, unknown> }) =>
  String(block.attrs?.['request'] ?? '');
const res = (block: { attrs?: Record<string, unknown> }) =>
  String(block.attrs?.['response'] ?? '');

registerBlockRenderers('http_request', {
  toMarkdown: (block) => [
    '```http',
    req(block),
    '```',
    '',
    '```http',
    res(block),
    '```',
  ],
  toHtml: (block) => `<div class="http">
        <pre>${escapeHtml(req(block))}</pre>
        <pre>${escapeHtml(res(block))}</pre>
      </div>`,
  toConfluence: (block) =>
    `<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">http</ac:parameter><ac:plain-text-body><![CDATA[${req(block)}]]></ac:plain-text-body></ac:structured-macro>` +
    `<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">http</ac:parameter><ac:plain-text-body><![CDATA[${res(block)}]]></ac:plain-text-body></ac:structured-macro>`,
  toWord: (block) => [
    new Paragraph({
      children: [new TextRun({ text: req(block), font: 'Consolas', size: 18 })],
    }),
    new Paragraph({ text: ' ' }),
    new Paragraph({
      children: [new TextRun({ text: res(block), font: 'Consolas', size: 18 })],
    }),
  ],
});
