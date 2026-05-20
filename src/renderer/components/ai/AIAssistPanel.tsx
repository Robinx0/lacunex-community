import { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  Wand2,
  ShieldCheck,
  FileText,
  CircleCheck,
  AlertTriangle,
  Settings2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type { Editor } from '@tiptap/core';
import { useMutation, useQuery, useQueryClient } from '@/lib/query';
import { ipc } from '@/lib/ipc';
import type { AiAction, IpcOutput } from '@shared/ipc-contracts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useActivityStore } from '@/stores/activityStore';

type OllamaStatus = IpcOutput<'ai.checkOllama'>;

const ACTION_LABEL: Record<AiAction, string> = {
  suggest_remediation: 'Suggest remediation',
  improve_clarity: 'Improve clarity',
  summarize_section: 'Summarize section',
};

interface FindingContext {
  findingNodeId: string;
  attrs: Record<string, unknown>;
  pos: number;
}

function findActiveFinding(editor: Editor): FindingContext | null {
  const { from } = editor.state.selection;
  let result: FindingContext | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (result) return false;
    if (node.type.name !== 'finding') return true;
    const end = pos + node.nodeSize;
    if (from >= pos && from <= end) {
      const id = (node.attrs['findingNodeId'] as string | null) ?? null;
      result = id
        ? { findingNodeId: id, attrs: node.attrs as Record<string, unknown>, pos }
        : null;
      return false;
    }
    return true;
  });
  return result;
}

function getSelectedText(editor: Editor): string {
  const { from, to } = editor.state.selection;
  if (from === to) {
    // No range — return the parent block's text.
    const $from = editor.state.selection.$from;
    const node = $from.node($from.depth);
    return node.textContent ?? '';
  }
  return editor.state.doc.textBetween(from, to, '\n');
}

export interface AIAssistPanelProps {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
}

export function AIAssistPanel({ open, onClose, editor }: AIAssistPanelProps): JSX.Element | null {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ['ai', 'settings'],
    queryFn: () => ipc.ai.settingsGet({}),
    enabled: open,
  });
  const ollamaStatus = useQuery({
    queryKey: ['ai', 'ollama-status'],
    queryFn: () => ipc.ai.checkOllama({}),
    enabled: open,
    staleTime: 30_000,
  });
  const setSettings = useMutation({
    mutationFn: (input: Parameters<typeof ipc.ai.settingsSet>[0]) => ipc.ai.settingsSet(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ai', 'settings'] });
      void qc.invalidateQueries({ queryKey: ['ai', 'ollama-status'] });
    },
  });

  const [showConfig, setShowConfig] = useState(false);
  const [draftModel, setDraftModel] = useState('llama3.2');
  const [draftOllama, setDraftOllama] = useState('http://localhost:11434');
  const [busy, setBusy] = useState<AiAction | null>(null);
  const [lastResult, setLastResult] = useState<{ action: AiAction; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activityStart = useActivityStore((s) => s.start);
  const activitySucceed = useActivityStore((s) => s.succeed);
  const activityFail = useActivityStore((s) => s.fail);

  useEffect(() => {
    if (settings.data) {
      setDraftModel(settings.data.model);
      setDraftOllama(settings.data.ollamaUrl ?? 'http://localhost:11434');
    }
  }, [settings.data]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const runAction = async (action: AiAction) => {
    if (!editor) {
      setError('No editor active');
      return;
    }
    setError(null);
    setBusy(action);
    const settingsSnap = settings.data;
    const activityId = activityStart({
      kind: 'ai',
      label: ACTION_LABEL[action],
      detail: settingsSnap ? `${settingsSnap.provider} · ${settingsSnap.model}` : undefined,
    });
    try {
      let context = '';
      const finding = findActiveFinding(editor);
      if (action === 'suggest_remediation') {
        if (!finding) {
          const msg = 'Place the cursor inside a finding card.';
          setError(msg);
          activityFail(activityId, msg);
          setBusy(null);
          return;
        }
        const a = finding.attrs;
        context = [
          `Vulnerability: ${a['title'] ?? ''}`,
          `Severity: ${a['severity'] ?? ''}, CVSS: ${a['cvss'] ?? '—'}, CWE: ${a['cwe'] ?? '—'}`,
          `Affected: ${a['affected'] ?? '—'}`,
          '',
          `Description: ${a['body'] ?? ''}`,
        ].join('\n');
      } else if (action === 'improve_clarity') {
        const sel = getSelectedText(editor);
        if (!sel.trim()) {
          const msg = 'Select a paragraph (or place the cursor inside one).';
          setError(msg);
          activityFail(activityId, msg);
          setBusy(null);
          return;
        }
        context = sel;
      } else {
        // summarize_section: take all the prose from the cursor's heading
        // until the next same-or-higher heading.
        context = collectSectionText(editor);
        if (!context.trim()) {
          const msg = 'Place the cursor inside a section.';
          setError(msg);
          activityFail(activityId, msg);
          setBusy(null);
          return;
        }
      }

      const result = await ipc.ai.generate({ action, context });
      setLastResult({ action, text: result.text });

      // Apply the result back into the editor.
      if (action === 'suggest_remediation' && finding) {
        const fresh = editor.state.doc.nodeAt(finding.pos);
        if (fresh) {
          editor
            .chain()
            .focus()
            .command(({ tr }) => {
              tr.setNodeMarkup(finding.pos, undefined, { ...fresh.attrs, remediation: result.text });
              return true;
            })
            .run();
        }
      } else if (action === 'improve_clarity') {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          editor.chain().focus().deleteRange({ from, to }).insertContent(result.text).run();
        } else {
          editor.chain().focus().insertContent(`\n\n${result.text}`).run();
        }
      } else {
        editor.chain().focus().insertContent(`\n\n> **TL;DR.** ${result.text}\n\n`).run();
      }
      activitySucceed(activityId, { label: `${ACTION_LABEL[action]} — done` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      activityFail(activityId, msg);
    } finally {
      setBusy(null);
    }
  };

  const s = settings.data;

  return (
    <div
      role="complementary"
      aria-label="AI assist"
      className="flex h-full w-full flex-col overflow-hidden border-l border-[var(--rb-border)] bg-[var(--rb-bg-sidebar)]"
    >
      <header className="flex items-center gap-2 border-b border-[var(--rb-border)] bg-[var(--rb-bg-base)] px-3 py-2">
        <Sparkles className="h-4 w-4 text-[var(--rb-purple)]" aria-hidden />
        <span className="text-sm font-semibold text-[var(--rb-text-primary)]">AI Assist</span>
        {s && (
          <span className="ml-2 rounded bg-[var(--rb-green-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--rb-green)]">
            {s.provider} · {s.model}
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowConfig((v) => !v)}
          aria-label="Provider settings"
          title="Provider settings"
          className="ml-auto rounded p-1 text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI panel"
          className="rounded p-1 text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showConfig && (
          <section className="rounded-lg border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--rb-text-muted)]">
              Provider
            </p>
            <p className="mb-3 rounded border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-base)] px-2 py-1.5 text-[11px] text-[var(--rb-text-secondary)]">
              <span className="rb-mono text-[var(--rb-text-primary)]">Ollama (local)</span>. All AI
              actions run on your machine. Nothing leaves the device.
            </p>

            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--rb-text-muted)]">
              Model
            </p>
            <input
              value={draftModel}
              onChange={(e) => setDraftModel(e.target.value)}
              placeholder="llama3.2"
              className="rb-finding-input w-full"
            />

            <p className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--rb-text-muted)]">
              Ollama URL
            </p>
            <input
              value={draftOllama}
              onChange={(e) => setDraftOllama(e.target.value)}
              placeholder="http://localhost:11434"
              className="rb-finding-input w-full font-mono"
            />

            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowConfig(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  setSettings.mutate(
                    {
                      model: draftModel,
                      ollamaUrl: draftOllama,
                    },
                    {
                      onSuccess: () => {
                        setShowConfig(false);
                      },
                    },
                  )
                }
                disabled={setSettings.isPending}
              >
                {setSettings.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </section>
        )}

        {ollamaStatus.data && !ollamaStatus.data.available && (
          <OllamaUnavailable
            status={ollamaStatus.data}
            recheck={() => ollamaStatus.refetch()}
            rechecking={ollamaStatus.isFetching}
            openSettings={() => setShowConfig(true)}
          />
        )}

        {(!ollamaStatus.data || ollamaStatus.data.available) && (
          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--rb-text-muted)]">
              Actions
            </p>
            <div className="space-y-2">
              <ActionButton
                icon={ShieldCheck}
                title="Suggest remediation"
                hint="Click inside a finding card."
                busy={busy === 'suggest_remediation'}
                onClick={() => runAction('suggest_remediation')}
              />
              <ActionButton
                icon={Wand2}
                title="Improve clarity"
                hint="Select a paragraph or place the cursor in one."
                busy={busy === 'improve_clarity'}
                onClick={() => runAction('improve_clarity')}
              />
              <ActionButton
                icon={FileText}
                title="Summarize section"
                hint="Cursor inside a heading's section."
                busy={busy === 'summarize_section'}
                onClick={() => runAction('summarize_section')}
              />
            </div>
          </section>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded border border-[var(--rb-red-bg)] bg-[var(--rb-red-bg)] p-2 text-xs text-[var(--rb-red)]">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {lastResult && (
          <section>
            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--rb-green)]">
              <CircleCheck className="h-3 w-3" aria-hidden />
              {ACTION_LABEL[lastResult.action]} — inserted
            </div>
            <p className="rounded bg-[var(--rb-bg-faint)] p-2 text-xs leading-relaxed text-[var(--rb-text-secondary)]">
              {lastResult.text}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

function collectSectionText(editor: Editor): string {
  const { $from } = editor.state.selection;
  // Walk top-level nodes, find the heading at or before the cursor, capture
  // until the next same-or-higher heading.
  const top = editor.state.doc;
  const cursorTop = $from.node(1) ?? $from.node(0);
  let cursorIdx = -1;
  let runningPos = 0;
  let i = 0;
  top.forEach((child) => {
    if (child === cursorTop) cursorIdx = i;
    runningPos += child.nodeSize;
    i += 1;
  });
  if (cursorIdx === -1) return '';

  // Find heading at or before cursor.
  let headingIdx = -1;
  let headingLevel = 99;
  for (let j = cursorIdx; j >= 0; j -= 1) {
    const node = top.child(j);
    if (node.type.name === 'heading') {
      headingIdx = j;
      headingLevel = (node.attrs['level'] as number) ?? 1;
      break;
    }
  }
  if (headingIdx === -1) {
    // No heading above — fall back to the current paragraph.
    return cursorTop.textContent ?? '';
  }
  // Capture nodes from heading until next same-or-higher heading.
  const parts: string[] = [];
  for (let j = headingIdx; j < top.childCount; j += 1) {
    const node = top.child(j);
    if (j > headingIdx && node.type.name === 'heading') {
      const lvl = (node.attrs['level'] as number) ?? 1;
      if (lvl <= headingLevel) break;
    }
    parts.push(node.textContent ?? '');
  }
  // Mark unused-but-tracked variable — we read runningPos for completeness
  // but it's not surfaced beyond the loop.
  void runningPos;
  return parts.join('\n').trim();
}

function OllamaUnavailable({
  status,
  recheck,
  rechecking,
  openSettings,
}: {
  status: Extract<OllamaStatus, { available: false }>;
  recheck: () => void;
  rechecking: boolean;
  openSettings: () => void;
}): JSX.Element {
  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-lg border border-[var(--rb-yellow-bg)] bg-[var(--rb-bg-faint)] p-3"
    >
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-[var(--rb-yellow)]" aria-hidden />
        <span className="text-[12px] font-semibold text-[var(--rb-text-primary)]">
          {OLLAMA_HEADLINE[status.reason]}
        </span>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-[var(--rb-text-secondary)]">
        {status.message}
      </p>

      {status.reason === 'not-running' && (
        <ol className="mb-3 list-decimal space-y-1 pl-4 text-[11px] text-[var(--rb-text-secondary)]">
          <li>
            Install Ollama from{' '}
            <a
              href="https://ollama.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-[var(--rb-blue)] underline-offset-2 hover:underline"
            >
              ollama.com
              <ExternalLink className="h-2.5 w-2.5" aria-hidden />
            </a>
            .
          </li>
          <li>
            Pull a model: <span className="rb-mono text-[var(--rb-text-primary)]">ollama pull llama3.2:3b</span>
          </li>
          <li>
            Make sure <span className="rb-mono text-[var(--rb-text-primary)]">ollama serve</span> is
            running.
          </li>
          <li>Click Re-check below.</li>
        </ol>
      )}

      {status.reason === 'no-models' && (
        <ol className="mb-3 list-decimal space-y-1 pl-4 text-[11px] text-[var(--rb-text-secondary)]">
          <li>
            Pull a model: <span className="rb-mono text-[var(--rb-text-primary)]">ollama pull llama3.2:3b</span>{' '}
            (or any other Ollama model).
          </li>
          <li>Click Re-check below.</li>
        </ol>
      )}

      {status.reason === 'invalid-url' && (
        <p className="mb-3 text-[11px] text-[var(--rb-text-secondary)]">
          Ollama URL must point at <span className="rb-mono">localhost</span> /{' '}
          <span className="rb-mono">127.0.0.1</span>. Open settings to fix it.
        </p>
      )}

      <p className="mb-3 text-[10.5px] text-[var(--rb-text-muted)]">
        Configured URL: <span className="rb-mono">{status.ollamaUrl}</span>
      </p>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={recheck} disabled={rechecking}>
          <RefreshCw className={cn('h-3 w-3', rechecking && 'animate-spin')} aria-hidden />
          {rechecking ? 'Checking…' : 'Re-check'}
        </Button>
        <Button size="sm" variant="ghost" onClick={openSettings}>
          <Settings2 className="h-3 w-3" aria-hidden />
          Settings
        </Button>
      </div>

      <p className="mt-3 text-[10.5px] text-[var(--rb-text-muted)]">
        AI assist is local-only. Ollama runs on your machine and Lacunex never sends your
        report content to a cloud LLM. The editor, exports, and templates all work without it.
      </p>
    </section>
  );
}

const OLLAMA_HEADLINE: Record<
  Extract<OllamaStatus, { available: false }>['reason'],
  string
> = {
  'not-running': 'Ollama not detected',
  'no-models': 'No Ollama models installed',
  'invalid-url': 'Invalid Ollama URL',
  unknown: 'Could not reach Ollama',
};

function ActionButton({
  icon: Icon,
  title,
  hint,
  busy,
  onClick,
}: {
  icon: typeof Sparkles;
  title: string;
  hint: string;
  busy: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-start gap-2 rounded-lg border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] p-2 text-left transition-colors hover:border-[var(--rb-blue)] disabled:opacity-60"
    >
      <Icon
        className={cn(
          'mt-0.5 h-3.5 w-3.5 shrink-0',
          busy ? 'animate-spin text-[var(--rb-blue)]' : 'text-[var(--rb-purple)]',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--rb-text-primary)]">
          {busy ? 'Working…' : title}
        </p>
        <p className="text-[10px] text-[var(--rb-text-muted)]">{hint}</p>
      </div>
    </button>
  );
}
