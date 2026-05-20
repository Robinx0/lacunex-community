import {
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { registerBlockRenderers } from './registry';
import { escapeHtml } from './_helpers';

interface TableAttrs {
  headers: string[];
  rows: string[][];
}

function readTable(block: { attrs?: Record<string, unknown> }): TableAttrs {
  const headers = Array.isArray(block.attrs?.['headers'])
    ? (block.attrs['headers'] as unknown[]).map((h) => String(h ?? ''))
    : [];
  const rawRows = Array.isArray(block.attrs?.['rows']) ? (block.attrs['rows'] as unknown[]) : [];
  const rows = rawRows.map((row) =>
    Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : [String(row ?? '')],
  );
  return { headers, rows };
}

registerBlockRenderers('table', {
  toMarkdown: (block) => {
    const { headers, rows } = readTable(block);
    if ((!headers || headers.length === 0) && rows.length === 0) return [];
    const lines: string[] = [];
    if (headers && headers.length > 0) {
      lines.push(`| ${headers.join(' | ')} |`);
      lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
    }
    for (const row of rows) lines.push(`| ${row.join(' | ')} |`);
    return lines;
  },
  toHtml: (block) => {
    const { headers, rows } = readTable(block);
    if ((!headers || headers.length === 0) && rows.length === 0) return '';
    const head = headers && headers.length > 0
      ? `<thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`
      : '';
    const body = `<tbody>${rows
      .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
      .join('')}</tbody>`;
    return `<table>${head}${body}</table>`;
  },
  toConfluence: (block) => {
    const { headers, rows } = readTable(block);
    if ((!headers || headers.length === 0) && rows.length === 0) return '';
    const head = headers && headers.length > 0
      ? `<tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`
      : '';
    const body = rows
      .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
      .join('');
    return `<table>${head}${body}</table>`;
  },
  toWord: (block) => {
    const { headers, rows } = readTable(block);
    if ((!headers || headers.length === 0) && rows.length === 0) return [];
    const allRows: TableRow[] = [];
    if (headers && headers.length > 0) {
      allRows.push(
        new TableRow({
          children: headers.map(
            (h) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
              }),
          ),
        }),
      );
    }
    for (const row of rows) {
      allRows.push(
        new TableRow({
          children: row.map(
            (c) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun(c)] })],
              }),
          ),
        }),
      );
    }
    return [new Table({ rows: allRows, width: { size: 100, type: WidthType.PERCENTAGE } })];
  },
});
