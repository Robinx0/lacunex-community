import { Paragraph, TextRun, AlignmentType } from 'docx';
import { registerBlockRenderers } from './registry';
import { escapeHtml } from './_helpers';

const fig = (block: { attrs?: Record<string, unknown> }) =>
  String(block.attrs?.['figure'] ?? '?');
const caption = (block: { attrs?: Record<string, unknown> }) =>
  String(block.attrs?.['caption'] ?? '');
// `_dataUrl` is injected by `injectAttachmentDataUrls` in shared/export/html.ts.
const dataUrl = (block: { attrs?: Record<string, unknown> }): string | null => {
  const v = block.attrs?.['_dataUrl'];
  return typeof v === 'string' && v.startsWith('data:image/') ? v : null;
};

registerBlockRenderers('screenshot', {
  toMarkdown: (block) => {
    const src = dataUrl(block) ?? '';
    return [`![${caption(block) || 'screenshot'}](${src})`, `*Fig ${fig(block)}*`];
  },
  toHtml: (block) => {
    const src = dataUrl(block);
    const captionLine = `<figcaption style="margin:8px 0 0;font-size:11.5px;color:var(--paper-text-muted);font-style:italic;text-align:center;">Fig ${escapeHtml(fig(block))} · ${escapeHtml(caption(block))}</figcaption>`;
    if (src) {
      return `<figure style="margin:20px 0;text-align:center;break-inside:avoid;page-break-inside:avoid;max-width:100%;"><img src="${escapeHtml(src)}" alt="${escapeHtml(caption(block))}" style="display:block;max-width:100%;max-height:240mm;width:auto;height:auto;object-fit:contain;margin:0 auto;border-radius:2px;">${captionLine}</figure>`;
    }
    return `<figure style="margin:20px 0;text-align:center;"><span style="font-size:11.5px;color:var(--paper-text-subtle);font-style:italic;">Fig ${escapeHtml(fig(block))} · ${escapeHtml(caption(block))}</span></figure>`;
  },
  toConfluence: (block) =>
    `<p><em>Fig ${escapeHtml(fig(block))} — ${escapeHtml(caption(block))}</em></p>`,
  toWord: (block) => [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Fig ${fig(block)}: ${caption(block)}`,
          italics: true,
          color: '666666',
        }),
      ],
    }),
  ],
});
