import { useEffect, useRef, useState } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Palette,
  Sparkles,
  FolderOpen,
  RotateCcw,
  Check,
  Copy,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@/lib/query';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/uiStore';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useModalLifecycle } from '@/hooks/useModalLifecycle';
import { ipc } from '@/lib/ipc';
import { editorThemes, type EditorThemeId } from '@/lib/themes/editorThemes';
import { cn } from '@/lib/utils';

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Top-level settings modal. Every section here actually does something
 * — no "coming soon" placeholders, no jump-buttons that point you back
 * at the main UI. If we add a section, it has to write real state.
 *
 * Sections:
 *   - Editor theme: live picker that mutates uiStore.theme. Same source
 *     of truth as the topbar dropdown — Settings is the canonical
 *     surface, the topbar dropdown is a quick-access duplicate.
 *   - AI provider: editable Ollama URL + model. Persisted via
 *     ai.settingsSet IPC. Test-connection button hits ai.checkOllama.
 *   - App data folder: shows the resolved userData path and reveals
 *     it in the host OS file explorer.
 *   - Reset preferences: clears the persisted UI state (localStorage
 *     'lacunex.ui.v1') and reloads the renderer. Reports / templates
 *     / attachments are NOT touched.
 */
export function SettingsModal({ open, onClose }: SettingsModalProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { mounted, phase } = useModalLifecycle(open);
  useModalA11y(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;
  const backdropAnim =
    phase === 'enter'
      ? 'animate-in fade-in-0 duration-150'
      : 'animate-out fade-out-0 duration-150';
  const panelAnim =
    phase === 'enter'
      ? 'animate-in fade-in-0 zoom-in-95 duration-150'
      : 'animate-out fade-out-0 zoom-out-95 duration-150';

  return (
    <div
      role="presentation"
      className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black/50', backdropAnim)}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className={cn(
          'relative flex h-[640px] max-h-[92vh] w-[760px] max-w-[94vw] flex-col rounded-lg border border-[var(--rb-border)] bg-[var(--rb-bg-popover)] shadow-pop focus:outline-none',
          panelAnim,
        )}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-[var(--rb-border-subtle)] px-4 py-3">
          <SettingsIcon className="h-4 w-4 text-[var(--rb-blue)]" aria-hidden />
          <h2 className="text-base font-semibold text-[var(--rb-text-primary)]">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded p-1 text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5">
          <ThemeSection />
          <AiProviderSection />
          <AppDataSection />
          <ResetSection />
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--rb-border-subtle)] px-4 py-3">
          <p className="text-[10.5px] text-[var(--rb-text-muted)]">
            Lacunex Community · local-first · source-available
          </p>
          <Button onClick={onClose}>Done</Button>
        </footer>
      </div>
    </div>
  );
}

/* =============================================================================
   Editor theme — radio-grid picker. Writes uiStore.theme directly.
============================================================================= */

function ThemeSection(): JSX.Element {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  return (
    <Section icon={Palette} title="Editor theme">
      <p className="mb-3 text-[11.5px] text-[var(--rb-text-secondary)]">
        Applies instantly. The topbar dropdown is a quick-access shortcut to the same setting.
      </p>
      <ul className="grid grid-cols-3 gap-2">
        {editorThemes.map((t) => {
          const active = t.id === theme;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setTheme(t.id as EditorThemeId)}
                aria-pressed={active}
                className={cn(
                  'flex w-full flex-col items-start gap-1.5 rounded-lg border px-2.5 py-2 text-left transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--rb-blue)]',
                  active
                    ? 'border-[var(--rb-blue)] bg-[var(--rb-blue-bg)]'
                    : 'border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] hover:border-[var(--rb-border)] hover:bg-[var(--rb-bg-hover)]',
                )}
              >
                <span className="flex w-full items-center gap-1">
                  {t.swatches.map((c, i) => (
                    <span
                      key={i}
                      className="h-3 w-3 shrink-0 rounded-sm ring-1 ring-inset ring-black/20"
                      style={{ background: c }}
                      aria-hidden
                    />
                  ))}
                  {active && (
                    <Check
                      className="ml-auto h-3 w-3 text-[var(--rb-blue)]"
                      aria-label="Selected"
                    />
                  )}
                </span>
                <span className="text-[12px] font-medium text-[var(--rb-text-primary)]">
                  {t.name}
                </span>
                <span className="line-clamp-2 text-[10.5px] text-[var(--rb-text-muted)]">
                  {t.tagline}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/* =============================================================================
   AI provider — full editable form. Same backing IPC as the AI panel
   header drawer; this is just the canonical surface.
============================================================================= */

function AiProviderSection(): JSX.Element {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ['ai', 'settings'],
    queryFn: () => ipc.ai.settingsGet({}),
  });
  const setSettings = useMutation({
    mutationFn: (input: Parameters<typeof ipc.ai.settingsSet>[0]) => ipc.ai.settingsSet(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ai', 'settings'] });
      void qc.invalidateQueries({ queryKey: ['ai', 'ollama-status'] });
    },
  });

  const [model, setModel] = useState('llama3.2');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [probeResult, setProbeResult] = useState<
    | { kind: 'idle' }
    | { kind: 'pending' }
    | { kind: 'ok'; message: string }
    | { kind: 'fail'; message: string }
  >({ kind: 'idle' });

  useEffect(() => {
    if (settings.data) {
      setModel(settings.data.model);
      setOllamaUrl(settings.data.ollamaUrl ?? 'http://localhost:11434');
    }
  }, [settings.data]);

  const dirty =
    settings.data !== undefined &&
    (settings.data.model !== model || (settings.data.ollamaUrl ?? '') !== ollamaUrl);

  const onSave = (): void => {
    setSettings.mutate({ provider: 'ollama', model, ollamaUrl });
  };

  const onTest = async (): Promise<void> => {
    setProbeResult({ kind: 'pending' });
    try {
      // Save first so the probe hits the URL the user is testing.
      if (dirty) await setSettings.mutateAsync({ provider: 'ollama', model, ollamaUrl });
      const res = await ipc.ai.checkOllama({});
      if (res.available) {
        setProbeResult({
          kind: 'ok',
          message: `Reachable. Models: ${res.models.slice(0, 3).join(', ')}${res.models.length > 3 ? '…' : ''}`,
        });
      } else {
        setProbeResult({ kind: 'fail', message: res.message });
      }
    } catch (err) {
      setProbeResult({
        kind: 'fail',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  return (
    <Section icon={Sparkles} title="AI assist · Ollama">
      <p className="mb-3 text-[11.5px] text-[var(--rb-text-secondary)]">
        AI actions run locally against an Ollama instance. No cloud LLM, no API key,
        no telemetry.
      </p>

      <div className="space-y-2">
        <Field label="Model">
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="llama3.2"
            className="rb-finding-input w-full"
            spellCheck={false}
          />
        </Field>
        <Field label="Ollama URL">
          <input
            value={ollamaUrl}
            onChange={(e) => setOllamaUrl(e.target.value)}
            placeholder="http://localhost:11434"
            className="rb-finding-input w-full font-mono"
            spellCheck={false}
          />
          <p className="mt-1 text-[10.5px] text-[var(--rb-text-muted)]">
            Must point at <span className="rb-mono">localhost</span> /{' '}
            <span className="rb-mono">127.0.0.1</span>. Other hostnames are rejected to prevent
            SSRF via the renderer.
          </p>
        </Field>
      </div>

      {probeResult.kind === 'ok' && (
        <p className="mt-2 text-[11px] text-[var(--rb-green)]">{probeResult.message}</p>
      )}
      {probeResult.kind === 'fail' && (
        <p className="mt-2 text-[11px] text-[var(--rb-red)]">{probeResult.message}</p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" onClick={onSave} disabled={!dirty || setSettings.isPending}>
          {setSettings.isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void onTest()}
          disabled={probeResult.kind === 'pending'}
        >
          {probeResult.kind === 'pending' ? 'Testing…' : 'Test connection'}
        </Button>
      </div>
    </Section>
  );
}

/* =============================================================================
   App data — show the userData path and reveal it in the OS shell.
============================================================================= */

function AppDataSection(): JSX.Element {
  const [copied, setCopied] = useState(false);

  // Read-only path lookup; no shell side effect.
  const pathQuery = useQuery({
    queryKey: ['app', 'userDataPath'],
    queryFn: () => ipc.app.getUserDataPath({}),
    staleTime: Infinity,
  });
  const path = pathQuery.data?.path ?? null;

  const reveal = useMutation({
    mutationFn: () => ipc.app.openUserDataFolder({}),
  });

  const onCopy = (): void => {
    if (!path) return;
    void navigator.clipboard.writeText(path).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Section icon={FolderOpen} title="App data folder">
      <p className="mb-3 text-[11.5px] text-[var(--rb-text-secondary)]">
        Reports (SQLite), attachments, AI usage log, and your settings live here. Useful for
        backup, migration, or sending diagnostics to support.
      </p>
      {path && (
        <div className="mb-2 flex items-center gap-2 rounded border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] px-2.5 py-1.5">
          <span className="rb-mono flex-1 truncate text-[11px] text-[var(--rb-text-primary)]">
            {path}
          </span>
          <button
            type="button"
            onClick={onCopy}
            aria-label="Copy path"
            title="Copy path"
            className="rounded p-1 text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
          >
            {copied ? (
              <Check className="h-3 w-3 text-[var(--rb-green)]" aria-hidden />
            ) : (
              <Copy className="h-3 w-3" aria-hidden />
            )}
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => reveal.mutate()}
          disabled={reveal.isPending}
        >
          <FolderOpen className="h-3 w-3" aria-hidden />
          Reveal in file explorer
        </Button>
      </div>
    </Section>
  );
}

/* =============================================================================
   Reset preferences — clears localStorage and reloads. Reports / data
   are NOT touched.
============================================================================= */

function ResetSection(): JSX.Element {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const onConfirm = async (): Promise<void> => {
    setPending(true);
    try {
      await ipc.app.resetUiPreferences({});
      // Main fires app:reset-ui-preferences which useAppActions
      // handles by clearing localStorage and reloading. Fall back to
      // clearing here directly if the push doesn't arrive in time.
      setTimeout(() => {
        try {
          localStorage.removeItem('lacunex.ui.v1');
        } catch {
          /* ignore */
        }
        window.location.reload();
      }, 200);
    } catch {
      setPending(false);
      setConfirming(false);
    }
  };

  return (
    <Section icon={RotateCcw} title="Reset UI preferences">
      <p className="mb-3 text-[11.5px] text-[var(--rb-text-secondary)]">
        Clears persisted UI state — theme, sidebar width, preview width, collapse states, last
        active report, workflow phase. Your reports, templates, attachments, and AI settings are
        NOT affected. The renderer reloads after reset.
      </p>
      {!confirming ? (
        <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
          <RotateCcw className="h-3 w-3" aria-hidden />
          Reset UI preferences
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] text-[var(--rb-text-secondary)]">Are you sure?</span>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={pending}
          >
            {pending ? 'Resetting…' : 'Yes, reset'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
            Cancel
          </Button>
        </div>
      )}
    </Section>
  );
}

/* =============================================================================
   Local primitives.
============================================================================= */

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof SettingsIcon;
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-[var(--rb-text-muted)]" aria-hidden />
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--rb-text-primary)]">
          {title}
        </h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--rb-text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}
