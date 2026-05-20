import type { Block } from '@shared/types';
import { ReportList } from './ReportList';
import { DocumentTree } from './DocumentTree';
import { SeverityStats } from './SeverityStats';
import { QuickLinks } from './QuickLinks';
import { ActivityStrip } from './ActivityStrip';
import { SectionLabel } from '@/components/ui/SectionLabel';

export interface SidebarProps {
  activeBlocks: Block[];
}

/**
 * Vertical sidebar layout, top to bottom:
 *   1. REPORTS — card list of every report; one click to switch
 *   2. OUTLINE — heading tree with word counts + finding-count badges
 *   3. FINDINGS — compact severity strip
 *   4. QUICK LINKS — Search / Templates / AI Assist / Variables
 *   5. ACTIVITY — bottom-pinned live feed of in-flight work (autosave,
 *      export, AI generation). Replaces the old "draft progress %" bar
 *      that surfaced a vanity number nobody acted on.
 *
 * ActivityStrip is pinned at the bottom of the sidebar (a sibling of
 * the scroll area, not inside it) so it stays visible while the user
 * scrolls. There is intentionally NO divider above it.
 */
export function Sidebar({ activeBlocks }: SidebarProps): JSX.Element {
  return (
    <aside
      className="flex h-full flex-col overflow-hidden border-r border-[var(--rb-border)] bg-[var(--rb-bg-sidebar)]"
      aria-label="Workspace sidebar"
    >
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        <ReportList />

        <section className="flex flex-col gap-1.5">
          <SectionLabel>Outline</SectionLabel>
          <DocumentTree blocks={activeBlocks} />
        </section>

        <SeverityStats blocks={activeBlocks} />

        <QuickLinks />
      </div>

      <div className="shrink-0 border-t border-[var(--rb-border-subtle)] bg-[var(--rb-bg-base)] px-2">
        <ActivityStrip />
      </div>
    </aside>
  );
}
