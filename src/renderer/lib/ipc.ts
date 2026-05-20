import type {
  IpcChannel,
  IpcInput,
  IpcOutput,
  IpcResult,
} from '@shared/ipc-contracts';
import type { LacunexApi } from '../../preload';

export class IpcError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: unknown) {
    super(message);
    this.name = 'IpcError';
  }
}

// The renderer always runs under Electron preload. `window.lacunex` is
// the contextBridge-exposed surface defined in src/preload/index.ts.
function getBridge(): LacunexApi {
  if (typeof window === 'undefined' || !window.lacunex) {
    throw new IpcError(
      'window.lacunex is not available; the preload did not run.',
      'PRELOAD_MISSING',
    );
  }
  return window.lacunex;
}

const bridge: LacunexApi = getBridge();

function unwrap<T>(p: Promise<IpcResult<T>>): Promise<T> {
  return p.then((envelope) => {
    if (envelope.ok) return envelope.data;
    throw new IpcError(envelope.error.message, envelope.error.code, envelope.error.details);
  });
}

// Typed IPC client. Returns unwrapped results or throws IpcError.
export const ipc = {
  reports: {
    list: (input: IpcInput<'reports.list'> = {}): Promise<IpcOutput<'reports.list'>> =>
      unwrap(bridge.reports.list(input)),
    get: (input: IpcInput<'reports.get'>): Promise<IpcOutput<'reports.get'>> =>
      unwrap(bridge.reports.get(input)),
    create: (input: IpcInput<'reports.create'>): Promise<IpcOutput<'reports.create'>> =>
      unwrap(bridge.reports.create(input)),
    update: (input: IpcInput<'reports.update'>): Promise<IpcOutput<'reports.update'>> =>
      unwrap(bridge.reports.update(input)),
    delete: (input: IpcInput<'reports.delete'>): Promise<IpcOutput<'reports.delete'>> =>
      unwrap(bridge.reports.delete(input)),
    duplicate: (input: IpcInput<'reports.duplicate'>): Promise<IpcOutput<'reports.duplicate'>> =>
      unwrap(bridge.reports.duplicate(input)),
  },
  templates: {
    list: (input: IpcInput<'templates.list'> = undefined): Promise<IpcOutput<'templates.list'>> =>
      unwrap(bridge.templates.list(input)),
    create: (input: IpcInput<'templates.create'>): Promise<IpcOutput<'templates.create'>> =>
      unwrap(bridge.templates.create(input)),
    delete: (input: IpcInput<'templates.delete'>): Promise<IpcOutput<'templates.delete'>> =>
      unwrap(bridge.templates.delete(input)),
  },
  findings: {
    search: (input: IpcInput<'findings.search'>): Promise<IpcOutput<'findings.search'>> =>
      unwrap(bridge.findings.search(input)),
  },
  attachments: {
    upload: (input: IpcInput<'attachments.upload'>): Promise<IpcOutput<'attachments.upload'>> =>
      unwrap(bridge.attachments.upload(input)),
    get: (input: IpcInput<'attachments.get'>): Promise<IpcOutput<'attachments.get'>> =>
      unwrap(bridge.attachments.get(input)),
    delete: (input: IpcInput<'attachments.delete'>): Promise<IpcOutput<'attachments.delete'>> =>
      unwrap(bridge.attachments.delete(input)),
  },
  exports: {
    run: (input: IpcInput<'export.run'>): Promise<IpcOutput<'export.run'>> =>
      unwrap(bridge.exports.run(input)),
  },
  ai: {
    settingsGet: (
      input: IpcInput<'ai.settingsGet'> = {},
    ): Promise<IpcOutput<'ai.settingsGet'>> => unwrap(bridge.ai.settingsGet(input)),
    settingsSet: (
      input: IpcInput<'ai.settingsSet'>,
    ): Promise<IpcOutput<'ai.settingsSet'>> => unwrap(bridge.ai.settingsSet(input)),
    generate: (input: IpcInput<'ai.generate'>): Promise<IpcOutput<'ai.generate'>> =>
      unwrap(bridge.ai.generate(input)),
    checkOllama: (
      input: IpcInput<'ai.checkOllama'> = {},
    ): Promise<IpcOutput<'ai.checkOllama'>> => unwrap(bridge.ai.checkOllama(input)),
  },
  app: {
    getUserDataPath: (
      input: IpcInput<'app.getUserDataPath'> = {},
    ): Promise<IpcOutput<'app.getUserDataPath'>> =>
      unwrap(bridge.app.getUserDataPath(input)),
    openUserDataFolder: (
      input: IpcInput<'app.openUserDataFolder'> = {},
    ): Promise<IpcOutput<'app.openUserDataFolder'>> =>
      unwrap(bridge.app.openUserDataFolder(input)),
    resetUiPreferences: (
      input: IpcInput<'app.resetUiPreferences'> = {},
    ): Promise<IpcOutput<'app.resetUiPreferences'>> =>
      unwrap(bridge.app.resetUiPreferences(input)),
    importFile: (
      input: IpcInput<'app.importFile'> = {},
    ): Promise<IpcOutput<'app.importFile'>> => unwrap(bridge.app.importFile(input)),
  },
} as const;

// Query keys, centralized so invalidation tracks channel naming.
export const qk = {
  reports: {
    all: ['reports'] as const,
    list: (archived = false) => ['reports', 'list', { archived }] as const,
    detail: (id: string) => ['reports', 'detail', id] as const,
  },
  templates: {
    all: ['templates'] as const,
    list: (category?: string) => ['templates', 'list', category ?? null] as const,
  },
  findings: {
    search: (query: string) => ['findings', 'search', query] as const,
  },
};

/** Re-export for callers that need the raw channel set. */
export type { IpcChannel, IpcResult };
