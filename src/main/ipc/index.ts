import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { ZodError, type ZodSchema } from 'zod';
import {
  ipcContracts,
  type IpcChannel,
  type IpcResult,
} from '@shared/ipc-contracts';
import type { ReportService } from '../services/ReportService';
import type { TemplateService } from '../services/TemplateService';
import type { FindingService } from '../services/FindingService';
import type { AttachmentService } from '../services/AttachmentService';
import type { ExportService } from '../services/ExportService';
import type { AIService } from '../services/AIService';

export interface IpcDependencies {
  reports: ReportService;
  templates: TemplateService;
  findings: FindingService;
  attachments: AttachmentService;
  exports: ExportService;
  ai: AIService;
}

type Handler = (input: unknown, deps: IpcDependencies) => unknown | Promise<unknown>;

const handlers: Record<IpcChannel, Handler> = {
  'reports.list': (input, { reports }) => {
    const parsed = input as { archived?: boolean } | undefined;
    return reports.list({ archived: parsed?.archived ?? false });
  },
  'reports.get': (input, { reports }) => {
    const { id } = input as { id: string };
    return reports.get(id);
  },
  'reports.create': (input, { reports }) => reports.create(input as Parameters<ReportService['create']>[0]),
  'reports.update': (input, { reports }) => {
    const { blocks, blocksUpsert, blocksDelete, ...rest } = input as Parameters<
      ReportService['update']
    >[0] & {
      blocks?: Parameters<ReportService['replaceBlocks']>[1];
      blocksUpsert?: Parameters<ReportService['replaceBlocks']>[1];
      blocksDelete?: string[];
    };
    // Single transaction wraps the meta UPDATE and the block writes —
    // before this they were separate transactions, leaving a torn-write
    // window where `meta_json` advanced but the blocks table held the
    // prior state. See ReportService.updateWithBlocks for the wrapping.
    return reports.updateWithBlocks(rest, {
      ...(blocks ? { blocks } : {}),
      ...(blocksUpsert ? { blocksUpsert } : {}),
      ...(blocksDelete ? { blocksDelete } : {}),
    });
  },
  'reports.delete': (input, { reports, attachments }) => {
    const { id } = input as { id: string };
    // Delete the row first so a failure leaves attachments intact and
    // recoverable. FK CASCADE wipes the attachments rows on success;
    // file cleanup is best-effort and idempotent below.
    reports.delete(id);
    attachments.deleteAllForReport(id);
    return { ok: true as const };
  },
  'reports.duplicate': (input, { reports }) => {
    const { id } = input as { id: string };
    return reports.duplicate(id);
  },

  'templates.list': (input, { templates }) => {
    const parsed = (input ?? {}) as { category?: string };
    return templates.list({ ...(parsed.category ? { category: parsed.category } : {}) });
  },
  'templates.create': (input, { templates }) => templates.create(input as Parameters<TemplateService['create']>[0]),
  'templates.delete': (input, { templates }) => {
    const { id } = input as { id: string };
    templates.delete(id);
    return { ok: true as const };
  },

  'findings.search': (input, { findings }) => {
    const { query } = input as { query: string };
    return findings.search(query);
  },

  'attachments.upload': (input, { attachments }) =>
    attachments.upload(input as Parameters<AttachmentService['upload']>[0]),
  'attachments.get': (input, { attachments }) => {
    const { id } = input as { id: string };
    return attachments.getDataUrl(id);
  },
  'attachments.delete': (input, { attachments }) => {
    const { id } = input as { id: string };
    attachments.delete(id);
    return { ok: true as const };
  },

  'export.run': (input, { exports }) =>
    exports.run(input as Parameters<ExportService['run']>[0]),

  'ai.settingsGet': (_input, { ai }) => ai.getSettings(),
  'ai.settingsSet': (input, { ai }) =>
    ai.setSettings(input as Parameters<AIService['setSettings']>[0]),
  'ai.generate': (input, { ai }) =>
    ai.generate(input as Parameters<AIService['generate']>[0]),
  'ai.checkOllama': (_input, { ai }) => ai.checkOllama(),

  'app.getUserDataPath': () => {
    return { path: app.getPath('userData') };
  },

  'app.openUserDataFolder': async () => {
    const path = app.getPath('userData');
    // `openPath` returns an empty string on success or an error
    // message on failure (e.g. path doesn't exist, no associated
    // app for the protocol). We surface a boolean so the renderer
    // can show a friendly toast either way.
    const err = await shell.openPath(path);
    return { path, opened: err === '' };
  },

  'app.resetUiPreferences': () => {
    // Renderer-side preferences live in localStorage under the
    // 'lacunex.ui.v1' key (see uiStore.ts). We can't touch
    // localStorage from main, so we ask the renderer to clear and
    // reload via a one-shot push message. The renderer's
    // `useAppActions` listener handles the reload + clear.
    const win = BrowserWindow.getAllWindows()[0];
    if (win && !win.isDestroyed()) {
      win.webContents.send('app:reset-ui-preferences');
    }
    return { ok: true as const };
  },

  'app.importFile': async () => {
    const win = BrowserWindow.getAllWindows()[0];
    const result = await dialog.showOpenDialog(win ?? null!, {
      title: 'Import as new report',
      properties: ['openFile'],
      filters: [
        { name: 'Markdown / Text', extensions: ['md', 'markdown', 'txt'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { picked: false as const };
    }
    const filePath = result.filePaths[0];
    // Cap at ~5 MB. Larger files are likely a misuse (binary file
    // chosen via the "All files" filter); reading a 200 MB blob into
    // a single Block.content string would lock up the renderer.
    const MAX_BYTES = 5 * 1024 * 1024;
    const buf = await readFile(filePath);
    if (buf.byteLength > MAX_BYTES) {
      throw new Error(
        `File too large to import (${Math.round(buf.byteLength / 1024)} KB; cap is ${MAX_BYTES / 1024} KB).`,
      );
    }
    return {
      picked: true as const,
      filename: basename(filePath),
      content: buf.toString('utf8'),
    };
  },
};

const isProduction = process.env['NODE_ENV'] === 'production';

/**
 * Trim leaked filesystem paths and SQL fragments out of error messages
 * before they cross the IPC boundary. better-sqlite3 errors include the
 * raw SQL text and node fs errors include absolute paths from
 * `getUserDataRoot()` — neither belongs in the renderer or any log
 * surface a user might forward.
 */
function redactErrorMessage(message: string): string {
  return message
    // Windows absolute paths.
    .replace(/[A-Za-z]:\\[^\s'"`]+/g, '<path>')
    // POSIX absolute paths.
    .replace(/\/(?:Users|home|tmp|var|etc|opt|root)\/[^\s'"`]+/g, '<path>')
    // Single-quoted SQL or path arguments commonly emitted by sqlite/fs.
    .replace(/'\/[^']{2,}'/g, "'<path>'");
}

function toFailure(err: unknown): IpcResult<never> {
  if (err instanceof ZodError) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Input failed schema validation',
        details: err.flatten(),
      },
    };
  }
  if (err instanceof Error) {
    const message = isProduction
      ? redactErrorMessage(err.message)
      : err.message;
    return {
      ok: false,
      error: {
        code: 'INTERNAL',
        message,
      },
    };
  }
  return {
    ok: false,
    error: { code: 'UNKNOWN', message: isProduction ? 'unknown error' : String(err) },
  };
}

/**
 * Reject IPC calls from any frame other than the application's main
 * document. `event.senderFrame` is the requesting frame; the contextBridge
 * preload only attaches to the top-level renderer, so child / web-view /
 * navigated frames have no business calling our channels even if they
 * somehow get the API surface (e.g. via a will-navigate bypass).
 */
function isTrustedSender(event: Electron.IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url ?? event.sender.getURL();
  if (!url) return false;
  if (url.startsWith('file://')) return true;
  const devOrigin = process.env['ELECTRON_RENDERER_URL'];
  if (devOrigin && url.startsWith(devOrigin)) return true;
  return false;
}

export function registerIpcHandlers(deps: IpcDependencies): void {
  for (const channel of Object.keys(ipcContracts) as IpcChannel[]) {
    const contract = ipcContracts[channel];
    const inputSchema = contract.input as ZodSchema;
    const outputSchema = contract.output as ZodSchema;
    const handler = handlers[channel];

    ipcMain.handle(channel, async (event, raw: unknown): Promise<IpcResult<unknown>> => {
      if (!isTrustedSender(event)) {
        return { ok: false, error: { code: 'FORBIDDEN', message: 'untrusted sender' } };
      }
      try {
        const input = inputSchema.parse(raw);
        const result = await handler(input, deps);
        const validated = outputSchema.parse(result);
        return { ok: true, data: validated };
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err);
        // Apply the same redaction the renderer sees, in production, so
        // path/SQL fragments don't hit the local log file in cleartext.
        console.error(
          `[ipc] ${channel} failed`,
          isProduction ? redactErrorMessage(errMessage) : err,
        );
        return toFailure(err);
      }
    });
  }
}

export function unregisterIpcHandlers(): void {
  for (const channel of Object.keys(ipcContracts) as IpcChannel[]) {
    ipcMain.removeHandler(channel);
  }
}
