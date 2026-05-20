import { Paragraph, TextRun } from 'docx';
import { registerBlockRenderers } from './registry';
import { blockText, escapeHtml } from './_helpers';

registerBlockRenderers('code_block', {
  toMarkdown: (block) => {
    const lang = (block.attrs?.['language'] as string | undefined) ?? '';
    return ['```' + lang, blockText(block) || '', '```'];
  },
  toHtml: (block) => {
    const lang = escapeHtml((block.attrs?.['language'] as string | undefined) ?? '');
    return `<pre><code class="language-${lang}">${escapeHtml(blockText(block))}</code></pre>`;
  },
  toConfluence: (block) => {
    const lang = escapeHtml((block.attrs?.['language'] as string | undefined) ?? '');
    // CDATA so XML-special chars inside the code aren't escaped.
    return `<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">${lang}</ac:parameter><ac:plain-text-body><![CDATA[${blockText(block)}]]></ac:plain-text-body></ac:structured-macro>`;
  },
  toWord: (block) => [
    new Paragraph({
      children: [new TextRun({ text: blockText(block), font: 'Consolas', size: 20 })],
      shading: { fill: 'F1F5F9', type: 'clear', color: 'auto' },
    }),
  ],
});
