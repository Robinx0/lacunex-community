import { Paragraph, TextRun } from 'docx';
import { registerBlockRenderers } from './registry';
import { escapeHtml } from './_helpers';

function cveText(block: { attrs?: Record<string, unknown> }): string {
  const id = (block.attrs?.['cveId'] as string | undefined) ?? '';
  const cvss = (block.attrs?.['cvss'] as string | undefined) ?? '';
  return cvss ? `${id} (CVSS ${cvss})` : id;
}

registerBlockRenderers('cve', {
  toMarkdown: (block) => {
    const text = cveText(block);
    return text ? [`**${text}**`] : [];
  },
  toHtml: (block) => {
    const text = cveText(block);
    return text ? `<span class="cve-pill">${escapeHtml(text)}</span>` : '';
  },
  toConfluence: (block) => {
    const text = cveText(block);
    return text ? `<strong>${escapeHtml(text)}</strong>` : '';
  },
  toWord: (block) => {
    const text = cveText(block);
    if (!text) return [];
    return [new Paragraph({ children: [new TextRun({ text, bold: true })] })];
  },
});
