import { Paragraph, TextRun } from 'docx';
import { extractTiptapText, escapeHtml } from '../util/text';
import type { Block } from '../types';

export function blockText(block: Block): string {
  return extractTiptapText(block.content);
}

export function plainParagraph(text: string): Paragraph {
  return new Paragraph({ children: [new TextRun(text)] });
}

export { extractTiptapText, escapeHtml };
