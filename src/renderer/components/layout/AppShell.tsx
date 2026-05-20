import { useState } from 'react';
import { Wand2, FileText, Sparkles } from 'lucide-react';
import type { Editor } from '@tiptap/core';
import type { Block, Report, Template } from '@shared/types';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/topbar/TopBar';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ResizeHandle } from '@/components/layout/ResizeHandle';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { BlockEditor } from '@/components/editor/BlockEditor';
import { PreviewPane } from '@/components/preview/PreviewPane';
import { FindingPanel } from '@/components/findings/FindingPanel';
import { ReviewView } from '@/components/review/ReviewView';
import { PublishView } from '@/components/publish/PublishView';
import { SaveAsTemplateModal } from '@/components/modals/SaveAsTemplateModal';
import { TemplateLibraryModal } from '@/components/modals/TemplateLibraryModal';
import { ExportModal } from '@/components/modals/ExportModal';
import { CommandPalette } from '@/components/modals/CommandPalette';
import { StyleGuideModal } from '@/components/modals/StyleGuideModal';
import { VariablesModal } from '@/components/modals/VariablesModal';
import { NewReportWizardModal } from '@/components/modals/NewReportWizardModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { AIAssistPanel } from '@/components/ai/AIAssistPanel';
import { RenameReportDialog } from '@/components/dialogs/RenameReportDialog';
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog';
import { useUiStore } from '@/stores/uiStore';
import { insertTemplate } from '@/lib/editor/templateInsert';
import type { AutosaveStatus } from '@/hooks/useAutosave';

export interface AppShellProps {
  activeReportId: string | null;
  listIsLoading: boolean;
  report: Report | null;
  reportTitle: string;
  editorBlocks: Block[];
  setEditorBlocks: (blocks: Block[]) => void;
  autosaveStatus: AutosaveStatus;
}

/**
 * Composition root for the app surface. Reads the workflow phase from
 * `useUiStore.composeMode` and dispatches to one of three top-level views:
 *
 *   compose → ComposeMain   — sidebar + editor + (preview / finding / AI)
 *   review  → ReviewView    — sidebar + paper-stack canvas + findings rail
 *   publish → PublishView   — sidebar + cover gallery + format/options rails
 *
 * Modals + lightweight dialogs render at the root regardless of mode.
 */
export function AppShell({
  activeReportId,
  listIsLoading,
  report,
  reportTitle,
  editorBlocks,
  setEditorBlocks,
  autosaveStatus,
}: AppShellProps): JSX.Element {
  const composeMode = useUiStore((s) => s.composeMode);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const nudgeSidebarWidth = useUiStore((s) => s.nudgeSidebarWidth);

  const modal = useUiStore((s) => s.modal);
  const saveTemplatePayload = useUiStore((s) => s.saveTemplatePayload);
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal = useUiStore((s) => s.openModal);

  /* The editor instance is local to this shell — only the Finding/AI panels
     consume it, and there's no need to expose it globally. */
  const [editor, setEditor] = useState<Editor | null>(null);

  const handleInsertTemplate = (t: Template) => {
    if (!editor) return;
    insertTemplate(editor, t);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--rb-bg-base)] text-[var(--rb-text-primary)]">
      <TopBar
        saved={autosaveStatus === 'saved' || autosaveStatus === 'idle'}
        reportTitle={reportTitle}
        reportDocId={report?.meta.docId}
        reportVersion={report?.meta.reportVersion}
        savedAt={report?.updatedAt}
        onExport={() => openModal('export')}
      />

      <div className="flex h-full min-h-0 flex-1">
        {/*
          Sidebar uses a wrapper-width transition pattern: the outer div
          animates `width` between `sidebarWidth` ↔ 0, while the inner
          div keeps a fixed `sidebarWidth` so the sidebar contents don't
          reflow during the slide. `overflow-hidden` clips the inner
          during the transition. Accessibility: when collapsed, mark the
          wrapper aria-hidden + inert so the inner content is excluded
          from tab order and screen readers.
        */}
        <div
          aria-hidden={sidebarCollapsed}
          {...(sidebarCollapsed ? { inert: '' as unknown as undefined } : {})}
          style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
          className="h-full shrink-0 overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
        >
          <div style={{ width: sidebarWidth }} className="h-full">
            <ErrorBoundary region="Sidebar">
              <Sidebar activeBlocks={editorBlocks} />
            </ErrorBoundary>
          </div>
        </div>
        {!sidebarCollapsed && <ResizeHandle edge="left" onResize={nudgeSidebarWidth} />}

        {composeMode === 'compose' && (
          <ComposeMain
            activeReportId={activeReportId}
            listIsLoading={listIsLoading}
            report={report}
            reportTitle={reportTitle}
            editorBlocks={editorBlocks}
            setEditorBlocks={setEditorBlocks}
            editor={editor}
            setEditor={setEditor}
          />
        )}

        {composeMode === 'review' && report && (
          <ErrorBoundary region="Review">
            <ReviewView report={report} blocks={editorBlocks} />
          </ErrorBoundary>
        )}

        {composeMode === 'publish' && report && (
          <ErrorBoundary region="Publish">
            <PublishView report={{ ...report, blocks: editorBlocks }} />
          </ErrorBoundary>
        )}

        {!report && composeMode !== 'compose' && (
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--rb-text-muted)]">
            Select a report from the sidebar to {composeMode === 'review' ? 'review' : 'publish'}.
          </div>
        )}
      </div>

      <ExportModal
        open={modal === 'export'}
        onClose={closeModal}
        reportId={activeReportId}
        reportTitle={reportTitle}
      />
      <SaveAsTemplateModal
        open={modal === 'saveTemplate'}
        payload={saveTemplatePayload}
        onClose={closeModal}
      />
      <TemplateLibraryModal
        open={modal === 'templateLibrary'}
        onClose={closeModal}
        onInsert={handleInsertTemplate}
      />
      <StyleGuideModal open={modal === 'styleGuide'} onClose={closeModal} />
      <VariablesModal open={modal === 'variables'} onClose={closeModal} />
      <CommandPalette
        open={modal === 'commandPalette'}
        onClose={closeModal}
        activeBlocks={editorBlocks}
      />
      <NewReportWizardModal open={modal === 'newReport'} onClose={closeModal} />
      <SettingsModal open={modal === 'settings'} onClose={closeModal} />

      {/* Lightweight dialogs — driven by `useUiStore.dialog`, single-active. */}
      <RenameReportDialog />
      <ConfirmDeleteDialog />

      <footer className="flex h-6 shrink-0 items-center gap-3 border-t border-[var(--rb-border-subtle)] bg-[var(--rb-bg-sidebar)] px-3 text-[10px] text-[var(--rb-text-muted)]">
        <span>autosave: {autosaveStatus}</span>
        <span aria-hidden>·</span>
        <span>
          {editorBlocks.length} block{editorBlocks.length === 1 ? '' : 's'}
        </span>
        <span aria-hidden>·</span>
        <span className="rb-mono uppercase tracking-[0.14em]">{composeMode}</span>
      </footer>
    </div>
  );
}

/**
 * Compose-mode main surface — extracted so AppShell stays a clean
 * mode-dispatch tree. Owns the editor mount, the right-rail panel
 * decision (preview vs finding vs AI), and the resize handle for the
 * preview side.
 */
function ComposeMain({
  activeReportId,
  listIsLoading,
  report,
  reportTitle,
  editorBlocks,
  setEditorBlocks,
  editor,
  setEditor,
}: {
  activeReportId: string | null;
  listIsLoading: boolean;
  report: Report | null;
  reportTitle: string;
  editorBlocks: Block[];
  setEditorBlocks: (blocks: Block[]) => void;
  editor: Editor | null;
  setEditor: (e: Editor | null) => void;
}): JSX.Element {
  const previewWidth = useUiStore((s) => s.previewWidth);
  const previewCollapsed = useUiStore((s) => s.previewCollapsed);
  const nudgePreviewWidth = useUiStore((s) => s.nudgePreviewWidth);
  const togglePreview = useUiStore((s) => s.togglePreview);

  const modal = useUiStore((s) => s.modal);
  const findingPanelId = useUiStore((s) => s.findingPanelId);
  const closeFinding = useUiStore((s) => s.closeFinding);
  const closeModal = useUiStore((s) => s.closeModal);
  const openSaveTemplate = useUiStore((s) => s.openSaveTemplate);

  const showAi = modal === 'aiAssist';
  const showFindingPanel = !showAi && Boolean(findingPanelId);
  // The preview slot is occupied iff there's a report AND no rival
  // panel (AI / Finding) is claiming the right rail. Within that, the
  // user can collapse via `previewCollapsed`. We render the slot
  // whenever it's *eligible* and animate width between previewWidth ↔ 0,
  // so collapse/expand is a smooth slide instead of a hard mount/unmount.
  const previewSlotEligible = !showAi && !showFindingPanel && Boolean(report);
  const showPreview = previewSlotEligible && !previewCollapsed;

  return (
    <>
      <main
        data-rb-zoom-target="editor"
        className="flex h-full min-w-0 flex-1 flex-col bg-[var(--rb-bg-base)]"
      >
        <ErrorBoundary region="Editor">
          {activeReportId && report ? (
            <BlockEditor
              reportId={activeReportId}
              reportTitle={reportTitle}
              initialBlocks={report.blocks}
              onChange={setEditorBlocks}
              onEditorReady={setEditor}
              editable
            />
          ) : (
            <EmptyEditorState loading={listIsLoading} />
          )}
        </ErrorBoundary>
      </main>

      {showAi && (
        <>
          <ResizeHandle edge="right" onResize={nudgePreviewWidth} />
          <div style={{ width: previewWidth }} className="h-full shrink-0">
            <AIAssistPanel open editor={editor} onClose={closeModal} />
          </div>
        </>
      )}

      {showFindingPanel && (
        <>
          <ResizeHandle edge="right" onResize={nudgePreviewWidth} />
          <div style={{ width: previewWidth }} className="h-full shrink-0">
            <FindingPanel
              editor={editor}
              findingNodeId={findingPanelId}
              onClose={closeFinding}
              onSaveAsTemplate={(block) =>
                openSaveTemplate({
                  blocks: [block],
                  type: 'finding',
                  suggestedName:
                    ((block.attrs?.['title'] as string | undefined) ?? 'Finding') +
                    ' — template',
                  suggestedIcon: '🛡️',
                  suggestedCategory: 'Findings',
                })
              }
            />
          </div>
        </>
      )}

      {previewSlotEligible && report && (
        <>
          {showPreview && <ResizeHandle edge="right" onResize={nudgePreviewWidth} />}
          {/*
            Same wrapper-width transition pattern as the sidebar: the
            outer div animates `width` between `previewWidth` ↔ 0; the
            inner div keeps a fixed `previewWidth` so PreviewPane never
            reflows during the slide. Mark aria-hidden + inert when
            collapsed so screen readers and tab order skip the
            now-invisible content.
          */}
          <div
            aria-hidden={!showPreview}
            {...(!showPreview ? { inert: '' as unknown as undefined } : {})}
            style={{ width: showPreview ? previewWidth : 0 }}
            className="h-full shrink-0 overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
          >
            <div style={{ width: previewWidth }} className="h-full">
              <ErrorBoundary region="Preview">
                <PreviewPane
                  report={{ ...report, blocks: editorBlocks }}
                  onCollapse={togglePreview}
                />
              </ErrorBoundary>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Editor surface when no report is selected. `seedReportsIfEmpty`
// plants a sample on first run, but the user can still hit this state
// by archiving every report or after a manual DB wipe.
function EmptyEditorState({ loading }: { loading: boolean }): JSX.Element {
  const openModal = useUiStore((s) => s.openModal);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--rb-text-muted)]">
        <Sparkles className="mr-2 h-3.5 w-3.5 animate-pulse text-[var(--rb-text-muted)]" aria-hidden />
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 animate-in fade-in-0 duration-300">
      <div className="flex max-w-md flex-col items-center text-center">
        <div
          className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--rb-bg-faint)] ring-1 ring-[var(--rb-border-subtle)]"
          aria-hidden
        >
          <FileText className="h-7 w-7 text-[var(--rb-blue)]" />
        </div>
        <h2 className="mb-2 text-base font-semibold text-[var(--rb-text-primary)]">
          No report open
        </h2>
        <p className="mb-5 text-[13px] leading-relaxed text-[var(--rb-text-secondary)]">
          Pick a report from the sidebar or start a new one. The wizard pre-loads a template,
          cover, and metadata for postmortems, audits, incidents, consulting, status,
          research, executive briefs, and pentest engagements.
        </p>
        <Button onClick={() => openModal('newReport')}>
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
          Start a new report
        </Button>
        <p className="mt-3 text-[10.5px] text-[var(--rb-text-muted)]">
          Tip: <span className="rb-mono">Cmd/Ctrl + K</span> opens the command palette anywhere in
          the app.
        </p>
      </div>
    </div>
  );
}
