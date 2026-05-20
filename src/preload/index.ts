import { contextBridge, ipcRenderer, webFrame } from 'electron';
import type {
  IpcChannel,
  IpcInput,
  IpcOutput,
  IpcResult,
} from '@shared/ipc-contracts';

function invoke<C extends IpcChannel>(
  channel: C,
  input: IpcInput<C>,
): Promise<IpcResult<IpcOutput<C>>> {
  return ipcRenderer.invoke(channel, input) as Promise<IpcResult<IpcOutput<C>>>;
}

const api = {
  ping: (): string => 'pong',
  reports: {
    list: (input: IpcInput<'reports.list'>) => invoke('reports.list', input),
    get: (input: IpcInput<'reports.get'>) => invoke('reports.get', input),
    create: (input: IpcInput<'reports.create'>) => invoke('reports.create', input),
    update: (input: IpcInput<'reports.update'>) => invoke('reports.update', input),
    delete: (input: IpcInput<'reports.delete'>) => invoke('reports.delete', input),
    duplicate: (input: IpcInput<'reports.duplicate'>) => invoke('reports.duplicate', input),
  },
  templates: {
    list: (input: IpcInput<'templates.list'>) => invoke('templates.list', input),
    create: (input: IpcInput<'templates.create'>) => invoke('templates.create', input),
    delete: (input: IpcInput<'templates.delete'>) => invoke('templates.delete', input),
  },
  findings: {
    search: (input: IpcInput<'findings.search'>) => invoke('findings.search', input),
  },
  attachments: {
    upload: (input: IpcInput<'attachments.upload'>) => invoke('attachments.upload', input),
    get: (input: IpcInput<'attachments.get'>) => invoke('attachments.get', input),
    delete: (input: IpcInput<'attachments.delete'>) => invoke('attachments.delete', input),
  },
  exports: {
    run: (input: IpcInput<'export.run'>) => invoke('export.run', input),
  },
  ai: {
    settingsGet: (input: IpcInput<'ai.settingsGet'>) => invoke('ai.settingsGet', input),
    settingsSet: (input: IpcInput<'ai.settingsSet'>) => invoke('ai.settingsSet', input),
    generate: (input: IpcInput<'ai.generate'>) => invoke('ai.generate', input),
    checkOllama: (input: IpcInput<'ai.checkOllama'>) => invoke('ai.checkOllama', input),
  },
  /**
   * Application-level surface. `onAction` is a one-way push channel
   * from the main-process menu to the renderer; the other two are
   * normal request/response calls invoked from the Settings modal.
   */
  app: {
    onAction: (callback: (action: AppAction) => void): (() => void) => {
      const handler = (_event: unknown, action: AppAction) => callback(action);
      ipcRenderer.on('app:action', handler);
      return () => ipcRenderer.off('app:action', handler);
    },
    onResetUiPreferences: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('app:reset-ui-preferences', handler);
      return () => ipcRenderer.off('app:reset-ui-preferences', handler);
    },
    getUserDataPath: (input: IpcInput<'app.getUserDataPath'>) =>
      invoke('app.getUserDataPath', input),
    openUserDataFolder: (input: IpcInput<'app.openUserDataFolder'>) =>
      invoke('app.openUserDataFolder', input),
    resetUiPreferences: (input: IpcInput<'app.resetUiPreferences'>) =>
      invoke('app.resetUiPreferences', input),
    importFile: (input: IpcInput<'app.importFile'>) =>
      invoke('app.importFile', input),
  },
  // Native Chromium page zoom via webFrame. setZoomLevel takes a
  // logarithmic level (0 = 100%, +1 ≈ 120%, -1 ≈ 83%). The renderer
  // clamps and animates; this surface is intentionally raw.
  zoom: {
    get: (): number => webFrame.getZoomLevel(),
    set: (level: number): void => {
      webFrame.setZoomLevel(level);
    },
  },
} as const;

export type AppAction = 'openSettings' | 'about';

export type LacunexApi = typeof api;

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('lacunex', api);
  } catch (error) {
    console.error('[preload] failed to expose lacunex api', error);
  }
} else {
  (globalThis as unknown as { lacunex: LacunexApi }).lacunex = api;
}
