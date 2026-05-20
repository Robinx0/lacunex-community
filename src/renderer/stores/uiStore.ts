import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_THEME_ID, type EditorThemeId } from '@/lib/themes/editorThemes';
import type { Block, Template } from '@shared/types';

/**
 * Modal identifiers — exhaustively listed so a typo at a call site is a
 * type error, not a no-op.
 */
export type ModalId =
  | 'export'
  | 'templateLibrary'
  | 'saveTemplate'
  | 'aiAssist'
  | 'commandPalette'
  | 'styleGuide'
  | 'variables'
  | 'newReport'
  | 'settings';

/**
 * Top-level workflow phase. The editor is always live; `composeMode`
 * gates which side panels are surfaced and (eventually) which actions
 * are available. Compose = author, Review = walk through findings,
 * Publish = export & sign-off. Persisted so the user resumes in the
 * same phase across launches.
 */
export type ComposeMode = 'compose' | 'review' | 'publish';

/**
 * Right-rail preview mode. Persisted so a user who lives in Body mode
 * doesn't get bounced back to Cover on every relaunch — the previous
 * default of Cover masked live body edits and read as a bug.
 */
export type PreviewMode = 'cover' | 'body' | 'metadata';

export interface SaveTemplatePayload {
  blocks: Block[];
  type: Template['type'];
  suggestedName: string;
  suggestedIcon: string;
  suggestedCategory: string;
}

/**
 * Lightweight dialog state — used for transient confirmations + rename
 * forms that should appear over the active modal/panel context. Distinct
 * from the heavier `modal` slot so a confirm-delete can pop while the
 * Template Library is open and not knock that primary modal away.
 */
export type DialogState =
  | { kind: 'renameReport'; reportId: string }
  | { kind: 'confirmDeleteReport'; reportId: string; reportTitle: string }
  | null;

export interface UiState {
  /* layout & theme — persisted */
  theme: EditorThemeId;
  sidebarWidth: number;
  previewWidth: number;
  sidebarCollapsed: boolean;
  previewCollapsed: boolean;
  activeReportId: string | null;
  composeMode: ComposeMode;
  previewMode: PreviewMode;

  /* transient — modal + side-panel state, not persisted */
  modal: ModalId | null;
  saveTemplatePayload: SaveTemplatePayload | null;
  /** Open Finding panel for this `findingNodeId`; null = closed. */
  findingPanelId: string | null;
  /** Lightweight dialog (rename form, confirm-delete, etc.) on top of everything. */
  dialog: DialogState;

  /* setters */
  setTheme: (theme: EditorThemeId) => void;
  setSidebarWidth: (width: number) => void;
  setPreviewWidth: (width: number) => void;
  /**
   * Resize handles emit a delta per pointer-move. Computing
   * `width + delta` from a captured render-time snapshot drifts during
   * a fast drag because each frame applies the delta against the same
   * stale snapshot. These additive setters always read the latest store
   * value, so the drag stays correct.
   */
  nudgeSidebarWidth: (delta: number) => void;
  nudgePreviewWidth: (delta: number) => void;
  toggleSidebar: () => void;
  togglePreview: () => void;
  setActiveReportId: (id: string | null) => void;
  setComposeMode: (mode: ComposeMode) => void;
  setPreviewMode: (mode: PreviewMode) => void;

  /* modal + panel API — call these from any component without prop-drilling */
  openModal: (id: ModalId) => void;
  closeModal: () => void;
  openSaveTemplate: (payload: SaveTemplatePayload) => void;
  openFinding: (findingNodeId: string) => void;
  closeFinding: () => void;

  /* dialog API — secondary, transient, single-active */
  openDialog: (dialog: NonNullable<DialogState>) => void;
  closeDialog: () => void;
}

export const SIDEBAR_MIN = 200;
export const SIDEBAR_MAX = 480;
export const PREVIEW_MIN = 360;
export const PREVIEW_MAX = 900;

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/**
 * Single source of truth for UI state. Layout fields (theme, panel widths,
 * collapse flags, active report) are persisted to localStorage. Modal and
 * finding-panel state is transient — losing it on reload is preferable to
 * showing a stale dialog on the next launch.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME_ID,
      sidebarWidth: 256,
      previewWidth: 520,
      sidebarCollapsed: false,
      previewCollapsed: false,
      activeReportId: null,
      composeMode: 'compose',
      // Body is the live-update preview — defaulting to Cover hid keystroke
      // changes and got reported as "preview doesn't update real-time".
      previewMode: 'body',

      modal: null,
      saveTemplatePayload: null,
      findingPanelId: null,
      dialog: null,

      setTheme: (theme) => set({ theme }),
      setSidebarWidth: (width) => set({ sidebarWidth: clamp(width, SIDEBAR_MIN, SIDEBAR_MAX) }),
      setPreviewWidth: (width) => set({ previewWidth: clamp(width, PREVIEW_MIN, PREVIEW_MAX) }),
      nudgeSidebarWidth: (delta) =>
        set((s) => ({ sidebarWidth: clamp(s.sidebarWidth + delta, SIDEBAR_MIN, SIDEBAR_MAX) })),
      nudgePreviewWidth: (delta) =>
        set((s) => ({ previewWidth: clamp(s.previewWidth + delta, PREVIEW_MIN, PREVIEW_MAX) })),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      togglePreview: () => set((s) => ({ previewCollapsed: !s.previewCollapsed })),
      // Switching reports clears anything that referenced the *previous*
      // report — finding panels, in-flight rename / confirm-delete dialogs,
      // open save-as-template payloads. Saves a class of "stale id" bugs.
      setActiveReportId: (id) =>
        set({
          activeReportId: id,
          findingPanelId: null,
          dialog: null,
          modal: null,
          saveTemplatePayload: null,
        }),
      setComposeMode: (composeMode) => set({ composeMode }),
      setPreviewMode: (previewMode) => set({ previewMode }),

      openModal: (id) => set({ modal: id }),
      closeModal: () => set({ modal: null, saveTemplatePayload: null }),
      openSaveTemplate: (payload) => set({ modal: 'saveTemplate', saveTemplatePayload: payload }),
      openFinding: (findingNodeId) => set({ findingPanelId: findingNodeId }),
      closeFinding: () => set({ findingPanelId: null }),
      openDialog: (dialog) => set({ dialog }),
      closeDialog: () => set({ dialog: null }),
    }),
    {
      name: 'lacunex.ui.v1',
      storage: createJSONStorage(() => localStorage),
      // Only the layout/theme fields persist. Modal/panel state is per-session.
      partialize: (s) => ({
        theme: s.theme,
        sidebarWidth: s.sidebarWidth,
        previewWidth: s.previewWidth,
        sidebarCollapsed: s.sidebarCollapsed,
        previewCollapsed: s.previewCollapsed,
        activeReportId: s.activeReportId,
        composeMode: s.composeMode,
        previewMode: s.previewMode,
      }),
    },
  ),
);
