import { Paragraph, TextRun } from 'docx';
import { registerBlockRenderers } from './registry';
import { escapeHtml } from './_helpers';

function chipLabel(block: { attrs?: Record<string, unknown> }): string {
  const type = (block.attrs?.['type'] as string | undefined) ?? '';
  const value = (block.attrs?.['value'] as string | undefined) ?? '';
  if (!value) return '';
  return type ? `${type}: ${value}` : value;
}

registerBlockRenderers('asset_chip', {
  toMarkdown: (block) => {
    const label = chipLabel(block);
    return label ? [`\`${label}\``] : [];
  },
  toHtml: (block) => {
    const label = chipLabel(block);
    return label ? `<code class="asset-chip">${escapeHtml(label)}</code>` : '';
  },
  toConfluence: (block) => {
    const label = chipLabel(block);
    return label ? `<code>${escapeHtml(label)}</code>` : '';
  },
  toWord: (block) => {
    const label = chipLabel(block);
    if (!label) return [];
    return [
      new Paragraph({
        children: [new TextRun({ text: label, font: 'Consolas' })],
      }),
    ];
  },
});
