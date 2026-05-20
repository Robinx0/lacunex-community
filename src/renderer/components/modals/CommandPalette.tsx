import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Search,
  FileText,
  Hash,
  Plus,
  FileDown,
  PanelLeft,
  PanelRight,
  Palette,
  BookOpen,
  Sparkles,
  Pencil,
  Eye,
  Send,
  Settings as SettingsIcon,
  ChevronRight,
} from 'lucide-react';
import { useReportList } from '@/hooks/useReports';
import { useUiStore } from '@/stores/uiStore';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useModalLifecycle } from '@/hooks/useModalLifecycle';
import { extractTiptapText } from '@shared/util/text';
import { editorThemes, type EditorThemeId } from '@/lib/themes/editorThemes';
import { cn } from '@/lib/utils';
import type { Block, ReportSummary } from '@shared/types';

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /** Active report's blocks (for the "Jump to heading" group). */
  activeBlocks: Block[];
}

interface CmdItem {
  id: string;
  label: string;
  hint?: string;
  /** Searchable haystack — pre-lowercased for cheap filter. */
  haystack: string;
  group: string;
  Icon: typeof Search;
  perform: () => void;
  /** Right-aligned shortcut hint, e.g. "⌘E". */
  shortcut?: string;
}

/**
 * Cmd+K command palette. Searchable, keyboard-navigable list of every
 * action a user can take and every place they can jump to. Replaces
 * three previous stub buttons (sidebar Search, topbar Search, QuickLinks
 * Search) with one real surface.
 */
export function CommandPalette({ open, onClose, activeBlocks }: CommandPaletteProps): JSX.Element | null {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  const reportListQuery = useReportList(false);
  const reports = useMemo(() => reportListQuery.data ?? [], [reportListQuery.data]);
  const setActiveReportId = useUiStore((s) => s.setActiveReportId);
  const openModal = useUiStore((s) => s.openModal);
  const setComposeMode = useUiStore((s) => s.setComposeMode);
  const setTheme = useUiStore((s) => s.setTheme);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const togglePreview = useUiStore((s) => s.togglePreview);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useModalA11y(panelRef, open);

  // Reset query + selection on every open.
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
    }
  }, [open]);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const items = useMemo<CmdItem[]>(() => {
    return buildItems({
      reports,
      activeBlocks,
      onClose,
      setActiveReportId,
      openModal,
      setComposeMode,
      setTheme,
      toggleSidebar,
      togglePreview,
      createReport: () => {
        onClose();
        openModal('newReport');
      },
    });
  }, [
    reports,
    activeBlocks,
    onClose,
    setActiveReportId,
    openModal,
    setComposeMode,
    setTheme,
    toggleSidebar,
    togglePreview,
  ]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((it) => it.haystack.includes(q));
  }, [items, query]);

  // Clamp selection when filter narrows.
  useEffect(() => {
    if (selected >= filtered.length) setSelected(Math.max(0, filtered.length - 1));
  }, [filtered.length, selected]);

  // Group filtered items by `group` for display, carrying each item's
  // index in `filtered` so the renderer doesn't have to call
  // `filtered.indexOf(item)` per row (was O(N²)). Hooks must be declared
  // before any early return — the value is unused when closed.
  const grouped = useMemo(() => {
    const map = new Map<string, Array<{ item: CmdItem; index: number }>>();
    for (let i = 0; i < filtered.length; i++) {
      const it = filtered[i];
      const arr = map.get(it.group) ?? [];
      arr.push({ item: it, index: i });
      map.set(it.group, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const { mounted, phase } = useModalLifecycle(open);
  if (!mounted) return null;
  // Cmd+K-style palette: slide-from-top + fade rather than zoom — it
  // anchors visually to a hypothetical Cmd+K trigger near the title bar
  // instead of expanding from the center like a centered dialog.
  const backdropAnim =
    phase === 'enter'
      ? 'animate-in fade-in-0 duration-150'
      : 'animate-out fade-out-0 duration-150';
  const panelAnim =
    phase === 'enter'
      ? 'animate-in fade-in-0 slide-in-from-top-2 duration-150'
      : 'animate-out fade-out-0 slide-out-to-top-2 duration-150';

  const performSelected = () => {
    const item = filtered[selected];
    if (!item) return;
    item.perform();
    onClose();
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => (s + 1) % Math.max(filtered.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => (s - 1 + filtered.length) % Math.max(filtered.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      performSelected();
    }
  };

  return (
    <div
      role="presentation"
      className={cn(
        'fixed inset-0 z-[55] flex items-start justify-center bg-black/55 pt-[12vh] backdrop-blur-sm',
        backdropAnim,
      )}
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
        aria-label="Command palette"
        className={cn(
          'relative flex max-h-[60vh] w-[640px] max-w-[92vw] flex-col rounded-lg border border-[var(--rb-border)] bg-[var(--rb-bg-popover)] shadow-pop focus:outline-none',
          panelAnim,
        )}
      >
        <div className="flex items-center gap-2 border-b border-[var(--rb-border-subtle)] px-3 py-2">
          <Search className="h-3.5 w-3.5 text-[var(--rb-text-muted)]" aria-hidden />
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search reports, headings, actions…"
            aria-label="Command palette"
            className="flex-1 bg-transparent text-sm text-[var(--rb-text-primary)] outline-none placeholder:text-[var(--rb-text-subtle)]"
          />
          <span className="rb-mono text-[10px] text-[var(--rb-text-subtle)]">esc</span>
        </div>

        <div className="flex-1 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-[var(--rb-text-muted)]">
              No matches for &ldquo;{query}&rdquo;
            </p>
          ) : (
            grouped.map(([group, list], gi) => (
              <Group key={group} title={group} divider={gi > 0}>
                {list.map(({ item, index }) => {
                  const active = index === selected;
                  return (
                    <CmdRow
                      key={item.id}
                      item={item}
                      active={active}
                      onMouseEnter={() => setSelected(index)}
                      onClick={() => {
                        item.perform();
                        onClose();
                      }}
                    />
                  );
                })}
              </Group>
            ))
          )}
        </div>

        <footer className="flex items-center gap-3 border-t border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] px-3 py-1.5 text-[10px] text-[var(--rb-text-muted)]">
          <KeyHint k="↑↓">navigate</KeyHint>
          <KeyHint k="↵">select</KeyHint>
          <KeyHint k="esc">close</KeyHint>
        </footer>
      </div>
    </div>
  );
}

function CmdRow({
  item,
  active,
  onClick,
  onMouseEnter,
}: {
  item: CmdItem;
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}): JSX.Element {
  const ref = useRef<HTMLButtonElement | null>(null);

  // Keep the active row scrolled into view.
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const Icon = item.Icon;
  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
        active ? 'bg-[var(--rb-bg-active)]' : 'hover:bg-[var(--rb-bg-hover)]',
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--rb-text-muted)]" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[var(--rb-text-primary)]">{item.label}</span>
      {item.hint && (
        <span className="rb-mono shrink-0 truncate text-[10px] text-[var(--rb-text-muted)]">
          {item.hint}
        </span>
      )}
      {item.shortcut && (
        <span className="rb-mono shrink-0 text-[10px] text-[var(--rb-text-subtle)]">
          {item.shortcut}
        </span>
      )}
      <ChevronRight className="h-3 w-3 shrink-0 text-[var(--rb-text-subtle)]" aria-hidden />
    </button>
  );
}

function Group({
  title,
  divider,
  children,
}: {
  title: string;
  divider: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className={cn(divider && 'mt-1 border-t border-[var(--rb-border-subtle)] pt-1')}>
      <p className="rb-section-label px-2 py-1.5">{title}</p>
      <div>{children}</div>
    </div>
  );
}

function KeyHint({ k, children }: { k: string; children: ReactNode }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="rb-mono rounded border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-active)] px-1 py-px text-[9px] text-[var(--rb-text-secondary)]">
        {k}
      </kbd>
      <span>{children}</span>
    </span>
  );
}

interface BuildItemsArgs {
  reports: ReportSummary[];
  activeBlocks: Block[];
  onClose: () => void;
  setActiveReportId: (id: string) => void;
  openModal: (id: 'export' | 'templateLibrary' | 'aiAssist' | 'settings') => void;
  setComposeMode: (m: 'compose' | 'review' | 'publish') => void;
  setTheme: (id: EditorThemeId) => void;
  toggleSidebar: () => void;
  togglePreview: () => void;
  createReport: () => void;
}

function buildItems({
  reports,
  activeBlocks,
  setActiveReportId,
  openModal,
  setComposeMode,
  setTheme,
  toggleSidebar,
  togglePreview,
  createReport,
}: BuildItemsArgs): CmdItem[] {
  const out: CmdItem[] = [];

  // Switch to report
  for (const r of reports) {
    out.push({
      id: `report:${r.id}`,
      group: 'Switch to report',
      label: r.title,
      hint: [r.docId, r.reportVersion ? `v${r.reportVersion}` : null].filter(Boolean).join(' · '),
      haystack: `${r.title} ${r.docId} ${r.reportVersion}`.toLowerCase(),
      Icon: FileText,
      perform: () => setActiveReportId(r.id),
    });
  }

  // Jump to heading (current report)
  for (const b of activeBlocks) {
    if (!b.type.startsWith('heading_')) continue;
    const text = extractTiptapText(b.content) || '(untitled heading)';
    out.push({
      id: `heading:${b.id}`,
      group: 'Jump to heading',
      label: text,
      hint: b.type.replace('heading_', 'h'),
      haystack: text.toLowerCase(),
      Icon: Hash,
      perform: () => {
        const el = document.getElementById(`block-${b.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
    });
  }

  // Findings — also navigable by vulnId / title
  for (const b of activeBlocks) {
    if (b.type !== 'finding') continue;
    const a = b.attrs ?? {};
    const vid = String(a['vulnId'] ?? '');
    const title = String(a['title'] ?? '(untitled finding)');
    out.push({
      id: `finding:${b.id}`,
      group: 'Findings in this report',
      label: title,
      hint: vid,
      haystack: `${vid} ${title}`.toLowerCase(),
      Icon: ChevronRight,
      perform: () => {
        const el = document.getElementById(`block-${b.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
    });
  }

  // Workflow phase
  out.push(
    {
      id: 'mode:compose',
      group: 'Workflow',
      label: 'Switch to Compose',
      shortcut: '⌘1',
      haystack: 'compose write edit',
      Icon: Pencil,
      perform: () => setComposeMode('compose'),
    },
    {
      id: 'mode:review',
      group: 'Workflow',
      label: 'Switch to Review',
      shortcut: '⌘2',
      haystack: 'review read-only check',
      Icon: Eye,
      perform: () => setComposeMode('review'),
    },
    {
      id: 'mode:publish',
      group: 'Workflow',
      label: 'Switch to Publish',
      shortcut: '⌘3',
      haystack: 'publish ship deliver final',
      Icon: Send,
      perform: () => setComposeMode('publish'),
    },
  );

  // Actions
  out.push(
    {
      id: 'action:newReport',
      group: 'Actions',
      label: 'New report',
      haystack: 'new report create',
      Icon: Plus,
      perform: createReport,
    },
    {
      id: 'action:export',
      group: 'Actions',
      label: 'Export current report…',
      shortcut: '⌘E',
      haystack: 'export pdf html markdown word json',
      Icon: FileDown,
      perform: () => openModal('export'),
    },
    {
      id: 'action:templates',
      group: 'Actions',
      label: 'Open template library',
      haystack: 'templates library',
      Icon: BookOpen,
      perform: () => openModal('templateLibrary'),
    },
    {
      id: 'action:aiAssist',
      group: 'Actions',
      label: 'Open AI Assist',
      haystack: 'ai assist suggest',
      Icon: Sparkles,
      perform: () => openModal('aiAssist'),
    },
    {
      id: 'action:settings',
      group: 'Actions',
      label: 'Open settings',
      shortcut: '⌘,',
      haystack: 'settings preferences theme ai provider data folder reset',
      Icon: SettingsIcon,
      perform: () => openModal('settings'),
    },
    {
      id: 'view:toggleSidebar',
      group: 'View',
      label: 'Toggle sidebar',
      shortcut: '⌘\\',
      haystack: 'toggle sidebar reports',
      Icon: PanelLeft,
      perform: toggleSidebar,
    },
    {
      id: 'view:togglePreview',
      group: 'View',
      label: 'Toggle preview',
      shortcut: '⌘.',
      haystack: 'toggle preview cover paper',
      Icon: PanelRight,
      perform: togglePreview,
    },
  );

  // Theme — listed individually so the user can set the theme straight
  // from the palette without bouncing through the topbar dropdown.
  for (const t of editorThemes) {
    out.push({
      id: `theme:${t.id}`,
      group: 'Theme',
      label: t.name,
      hint: t.tagline,
      haystack: `theme ${t.name} ${t.tagline}`.toLowerCase(),
      Icon: Palette,
      perform: () => setTheme(t.id),
    });
  }

  return out;
}
