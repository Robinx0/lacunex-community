import { Paragraph, PageBreak } from 'docx';
import { registerBlockRenderers } from './registry';

registerBlockRenderers('page_break', {
  toMarkdown: () => ['', '\\pagebreak', ''],
  toHtml: () => '<div class="page-break" style="page-break-after: always;"></div>',
  toConfluence: () => '<p style="page-break-after: always;"></p>',
  toWord: () => [new Paragraph({ children: [new PageBreak()] })],
});
