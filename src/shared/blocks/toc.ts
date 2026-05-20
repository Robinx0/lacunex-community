import { Paragraph, TextRun } from 'docx';
import { registerBlockRenderers } from './registry';

// Word regenerates the TOC field on open; here we just emit a marker.
const TOC_MARKER = 'Table of Contents';

registerBlockRenderers('toc', {
  toMarkdown: () => ['## ' + TOC_MARKER, '', '<!-- toc -->'],
  toHtml: () =>
    `<nav class="toc" aria-label="Table of contents"><h2>${TOC_MARKER}</h2></nav>`,
  toConfluence: () => '<ac:structured-macro ac:name="toc" />',
  toWord: () => [
    new Paragraph({
      children: [new TextRun({ text: TOC_MARKER, bold: true, size: 28 })],
    }),
  ],
});
