import { dialog } from 'electron';
import { writeFile } from 'node:fs/promises';
import type { Report } from '@shared/types';
import type { ExportFormat } from '@shared/ipc-contracts';
import { renderReportHtml } from '@shared/export/html';
import { blocksToMarkdown } from '@shared/export/markdown';
import { buildWordDocument } from '../export/word';
import { buildReportPdf } from '../export/pdf';
import type { ReportService } from './ReportService';
import type { AttachmentService } from './AttachmentService';

const EXTENSIONS: Record<ExportFormat, { ext: string; mimetype: string; label: string }> = {
  pdf: { ext: 'pdf', mimetype: 'application/pdf', label: 'PDF' },
  html: { ext: 'html', mimetype: 'text/html', label: 'HTML' },
  markdown: { ext: 'md', mimetype: 'text/markdown', label: 'Markdown' },
  word: {
    ext: 'docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Word',
  },
};

export interface ExportRunInput {
  reportId: string;
  format: ExportFormat;
  filename: string;
  options?: { includeCover?: boolean; redactPii?: boolean; pagedLayout?: boolean };
}

export interface ExportRunOutput {
  format: ExportFormat;
  filepath: string | null;
  bytes: number;
  mimetype: string;
  filename: string;
}

export class ExportService {
  constructor(
    private readonly reports: ReportService,
    /**
     * Optional — when provided, screenshot blocks get their data URL
     * resolved before HTML/PDF render so images actually appear in
     * the export. Optional so older call-sites (and tests that don't
     * exercise the attachment path) keep compiling, but the IPC
     * wiring in main/index.ts always passes it in production.
     */
    private readonly attachments?: AttachmentService,
  ) {}

  async run(input: ExportRunInput): Promise<ExportRunOutput> {
    const report = this.reports.get(input.reportId);
    if (!report) throw new Error(`Report not found: ${input.reportId}`);

    // Resolve every screenshot block's attachmentId into a data: URL
    // up front so the shared HTML renderer (which has no fs access)
    // can emit real <img> tags. Linear walk + 1 DB query per
    // screenshot is cheap even on a 100-image report.
    const attachmentMap = this.resolveAttachmentDataUrls(report);

    const { content, mimetype } = await this.renderFor(input.format, report, {
      ...input.options,
      attachments: attachmentMap,
    });
    const ext = EXTENSIONS[input.format].ext;
    const defaultPath = ensureExt(input.filename, ext);

    const result = await dialog.showSaveDialog({
      defaultPath,
      filters: [
        { name: EXTENSIONS[input.format].label, extensions: [ext] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePath) {
      return {
        format: input.format,
        filepath: null,
        bytes: 0,
        mimetype,
        filename: defaultPath,
      };
    }
    await writeFile(result.filePath, content);
    return {
      format: input.format,
      filepath: result.filePath,
      bytes: content.byteLength,
      mimetype,
      filename: defaultPath,
    };
  }

  private async renderFor(
    format: ExportFormat,
    report: Report,
    options: {
      includeCover?: boolean;
      redactPii?: boolean;
      pagedLayout?: boolean;
      attachments?: Record<string, string>;
    } = {},
  ): Promise<{ content: Buffer; mimetype: string }> {
    const { mimetype } = EXTENSIONS[format];
    switch (format) {
      case 'pdf': {
        const pdf = await buildReportPdf(report, options);
        return { content: pdf, mimetype };
      }
      case 'html':
        return { content: Buffer.from(renderReportHtml(report, options), 'utf8'), mimetype };
      case 'markdown':
        return { content: Buffer.from(blocksToMarkdown(report), 'utf8'), mimetype };
      case 'word': {
        const buf = await buildWordDocument(report);
        return { content: buf, mimetype };
      }
    }
  }

  /**
   * Walk the report's blocks, find every screenshot's attachmentId,
   * and resolve it to a `data:image/...;base64,...` URL via
   * AttachmentService. Returns an empty map if no AttachmentService
   * is wired (test seams, older callers) — the HTML renderer falls
   * back to caption-only frames in that case.
   */
  private resolveAttachmentDataUrls(report: Report): Record<string, string> {
    const out: Record<string, string> = {};
    if (!this.attachments) return out;
    for (const block of report.blocks) {
      if (block.type !== 'screenshot') continue;
      const id = block.attrs?.['attachmentId'];
      if (typeof id !== 'string' || out[id]) continue;
      const data = this.attachments.getDataUrl(id);
      if (data) {
        out[id] = `data:${data.mimetype};base64,${data.base64}`;
      }
    }
    return out;
  }
}

function ensureExt(filename: string, ext: string): string {
  return filename.toLowerCase().endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
}
