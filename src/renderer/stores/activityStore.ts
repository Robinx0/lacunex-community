import { create } from 'zustand';

/**
 * Categories of work the strip surfaces. Keep this exhaustive so a typo at a
 * call site is a type error, not a silent no-op.
 */
export type ActivityKind = 'autosave' | 'export' | 'ai' | 'system';

export type ActivityStatus = 'running' | 'success' | 'error';

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  /** One-line label shown in the strip — e.g. "Saving" or "Export PDF". */
  label: string;
  /** Optional secondary line shown on hover / when there's room. */
  detail?: string;
  status: ActivityStatus;
  startedAt: number;
  finishedAt?: number;
  /** Error message — set when status === 'error'. */
  error?: string;
}

interface ActivityState {
  entries: ActivityEntry[];

  /** Begin a new running entry. Returns the generated id. */
  start: (input: { kind: ActivityKind; label: string; detail?: string; id?: string }) => string;
  /** Mark an entry as successful. Auto-removed after a short delay. */
  succeed: (id: string, patch?: { label?: string; detail?: string }) => void;
  /** Mark an entry as failed. Persists until dismissed. */
  fail: (id: string, error: string) => void;
  /** Remove an entry immediately — used by the user's dismiss button. */
  dismiss: (id: string) => void;
  /** Clear all completed entries. */
  clearCompleted: () => void;

  /**
   * Autosave is a high-frequency cycle (pending → saving → saved → idle).
   * We collapse it into a single replaceable entry by id so the strip never
   * shows "Saving · Saving · Saving" stacked. Callers map their internal
   * status to one of these four states.
   */
  setAutosave: (state: 'pending' | 'saving' | 'saved' | 'error', error?: string) => void;
}

const SUCCESS_LINGER_MS = 2500;
const AUTOSAVE_ID = 'autosave-singleton';

let counter = 0;
function nextId(): string {
  counter += 1;
  return `act-${Date.now().toString(36)}-${counter}`;
}

export const useActivityStore = create<ActivityState>()((set, get) => ({
  entries: [],

  start: ({ kind, label, detail, id }) => {
    const entryId = id ?? nextId();
    set((s) => ({
      entries: [
        ...s.entries.filter((e) => e.id !== entryId),
        {
          id: entryId,
          kind,
          label,
          detail,
          status: 'running',
          startedAt: Date.now(),
        },
      ],
    }));
    return entryId;
  },

  succeed: (id, patch) => {
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === id
          ? {
              ...e,
              status: 'success' as const,
              finishedAt: Date.now(),
              label: patch?.label ?? e.label,
              detail: patch?.detail ?? e.detail,
            }
          : e,
      ),
    }));
    // Auto-remove after the linger window. We re-check the entry's status
    // before deleting so a new run() that reuses the same id (autosave does)
    // doesn't get evicted out from under the next run.
    setTimeout(() => {
      const fresh = get().entries.find((e) => e.id === id);
      if (fresh && fresh.status === 'success') {
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
      }
    }, SUCCESS_LINGER_MS);
  },

  fail: (id, error) => {
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === id
          ? { ...e, status: 'error' as const, finishedAt: Date.now(), error }
          : e,
      ),
    }));
  },

  dismiss: (id) => {
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
  },

  clearCompleted: () => {
    set((s) => ({ entries: s.entries.filter((e) => e.status === 'running') }));
  },

  setAutosave: (state, error) => {
    if (state === 'pending') {
      // 'pending' is the debounce window — don't surface it. The user
      // hasn't paused typing long enough for "saving" to be true; showing
      // a spinner here would flicker on every keystroke.
      return;
    }
    if (state === 'saving') {
      get().start({ kind: 'autosave', label: 'Saving…', id: AUTOSAVE_ID });
      return;
    }
    if (state === 'saved') {
      // If there's no in-flight autosave entry (typical after the first
      // snapshot or after a no-op equality check), don't fabricate one
      // just to immediately retire it.
      const existing = get().entries.find((e) => e.id === AUTOSAVE_ID);
      if (!existing) return;
      get().succeed(AUTOSAVE_ID, { label: 'Saved' });
      return;
    }
    // state === 'error'
    const existing = get().entries.find((e) => e.id === AUTOSAVE_ID);
    if (!existing) {
      get().start({ kind: 'autosave', label: 'Save failed', id: AUTOSAVE_ID });
    }
    get().fail(AUTOSAVE_ID, error ?? 'Autosave failed');
  },
}));
