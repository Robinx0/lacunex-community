import { BookOpen, BookMarked, Variable, FileSearch, Sparkles } from 'lucide-react';
import { useTemplateList } from '@/hooks/useTemplates';
import { useUiStore } from '@/stores/uiStore';
import { SectionLabel } from '@/components/ui/SectionLabel';

interface LinkItem {
  Icon: typeof BookOpen;
  label: string;
  shortcut?: string;
  count?: number;
  badge?: string;
  onClick: () => void;
}

/**
 * Compact list of quick-access utilities. Every entry maps to a real
 * surface — no stubs. Order matches the LUMEN reference: Search,
 * Templates, Style guide, Variables, AI Assist.
 */
export function QuickLinks(): JSX.Element {
  const openModal = useUiStore((s) => s.openModal);
  const templates = useTemplateList();

  const items: LinkItem[] = [
    {
      Icon: FileSearch,
      label: 'Search',
      shortcut: '⌘K',
      onClick: () => openModal('commandPalette'),
    },
    {
      Icon: BookOpen,
      label: 'Templates',
      count: templates.data?.length ?? 0,
      onClick: () => openModal('templateLibrary'),
    },
    {
      Icon: BookMarked,
      label: 'Style guide',
      onClick: () => openModal('styleGuide'),
    },
    {
      Icon: Variable,
      label: 'Variables',
      onClick: () => openModal('variables'),
    },
    {
      Icon: Sparkles,
      label: 'AI Assist',
      badge: 'beta',
      onClick: () => openModal('aiAssist'),
    },
  ];

  return (
    <section className="flex flex-col gap-1">
      <SectionLabel>Quick links</SectionLabel>
      <ul className="flex flex-col gap-px">
        {items.map((item) => (
          <li key={item.label}>
            <QuickLinkRow {...item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function QuickLinkRow({ Icon, label, shortcut, count, badge, onClick }: LinkItem): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[12px] text-[var(--rb-text-secondary)] transition-colors hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)] focus:outline-none focus-visible:bg-[var(--rb-bg-hover)]"
    >
      <Icon className="h-3 w-3 shrink-0 text-[var(--rb-text-muted)]" aria-hidden />
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className="rounded bg-[var(--rb-purple-bg)] px-1 py-px text-[8px] font-semibold uppercase tracking-[0.1em] text-[var(--rb-purple)]">
          {badge}
        </span>
      )}
      {typeof count === 'number' && (
        <span className="rb-mono rb-tabular shrink-0 text-[9px] text-[var(--rb-text-subtle)]">
          {count}
        </span>
      )}
      {shortcut && (
        <span className="rb-mono shrink-0 text-[9px] text-[var(--rb-text-subtle)]">{shortcut}</span>
      )}
    </button>
  );
}
