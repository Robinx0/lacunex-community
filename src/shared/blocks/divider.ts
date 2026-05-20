import { Paragraph, AlignmentType } from 'docx';
import { registerBlockRenderers } from './registry';

registerBlockRenderers('divider', {
  toMarkdown: () => ['---'],
  toHtml: () => '<hr/>',
  toConfluence: () => '<hr/>',
  toWord: () => [
    new Paragraph({
      text: '────────────────────────────────',
      alignment: AlignmentType.CENTER,
    }),
  ],
});
