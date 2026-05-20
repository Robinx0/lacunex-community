import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import type { Editor } from '@tiptap/core';
import type { Block } from '@shared/types';
import { SlashCommands } from './extensions/SlashCommands';
import { CodeBlockNode } from './extensions/CodeBlockLowlight';
import { CalloutNode } from './extensions/CalloutNode';
import { FindingNode } from './extensions/FindingNode';
import { ScreenshotNode } from './extensions/ScreenshotNode';
import { PocNode } from './extensions/PocNode';
import { HttpRequestNode } from './extensions/HttpRequestNode';
import { SeverityBadgeNode } from './extensions/SeverityBadgeNode';
import { AssetChipNode } from './extensions/AssetChipNode';
import { CveNode } from './extensions/CveNode';
import { ImagePasteDrop } from './extensions/ImagePasteDrop';
import { EditableReportTitle } from './EditableReportTitle';
import { blocksToTiptapDoc, tiptapDocToBlocks } from '@/lib/editor/blocksBridge';
import { ipc } from '@/lib/ipc';
import './editorStyles.css';
import 'highlight.js/styles/atom-one-dark.css';

export interface BlockEditorProps {
  reportId: string;
  reportTitle: string;
  initialBlocks: Block[];
  onChange: (blocks: Block[]) => void;
  onEditorReady?: (editor: Editor | null) => void;
  editable?: boolean;
}

export function BlockEditor({
  reportId,
  reportTitle,
  initialBlocks,
  onChange,
  onEditorReady,
  editable = true,
}: BlockEditorProps): JSX.Element {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onEditorReadyRef = useRef(onEditorReady);
  onEditorReadyRef.current = onEditorReady;

  // Tracks current reportId so the extension closure never goes stale.
  const reportIdRef = useRef(reportId);
  reportIdRef.current = reportId;

  const initialContent = useMemo(() => blocksToTiptapDoc(initialBlocks), [initialBlocks]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          heading: { levels: [1, 2, 3] },
        }),
        CodeBlockNode,
        Placeholder.configure({
          placeholder: ({ node }) => {
            if (node.type.name === 'heading') return 'Heading';
            return 'Type \'/\' for commands…';
          },
          showOnlyCurrent: true,
        }),
        Link.configure({
          openOnClick: false,
          // Block javascript: / data: URLs from pasted content.
          protocols: ['http', 'https', 'mailto'],
          autolink: true,
          validate: (href) => /^(https?:|mailto:)/i.test(href),
        }),
        CalloutNode,
        FindingNode,
        ScreenshotNode,
        PocNode,
        HttpRequestNode,
        SeverityBadgeNode,
        AssetChipNode,
        CveNode,
        SlashCommands,
        ImagePasteDrop.configure({
          getReportId: () => reportIdRef.current,
          upload: async (input) => {
            try {
              const attachment = await ipc.attachments.upload(input);
              return attachment.id;
            } catch (err) {
              console.warn('[ImagePasteDrop] upload failed', err);
              return null;
            }
          },
          onError: (msg) => {
            console.warn(`[ImagePasteDrop] ${msg}`);
          },
        }),
      ],
      content: initialContent,
      editorProps: {
        attributes: {
          class: 'rb-prose focus:outline-none',
        },
      },
      // Gate on docChanged — onTransaction also fires on selection moves.
      onTransaction: ({ editor: ed, transaction }) => {
        if (!transaction.docChanged) return;
        const blocks = tiptapDocToBlocks(ed.getJSON());
        onChangeRef.current(blocks);
      },
    },
    [reportId],
  );

  useEffect(() => {
    onEditorReadyRef.current?.(editor);
    return () => onEditorReadyRef.current?.(null);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    if (editor.isEditable !== editable) editor.setEditable(editable);
  }, [editor, editable]);

  // ⌘⇧↑ / Ctrl+Shift+↑ moves the current block up; ↓ moves it down.
  useEffect(() => {
    if (!editor) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'ArrowUp') {
        e.preventDefault();
        moveBlock(editor, -1);
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault();
        moveBlock(editor, 1);
      }
    };
    const dom = editor.view.dom;
    dom.addEventListener('keydown', onKey);
    return () => dom.removeEventListener('keydown', onKey);
  }, [editor]);

  return (
    <div className="mx-auto flex h-full w-full max-w-[820px] flex-col gap-6 overflow-y-auto px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
      <header className="border-b border-[var(--rb-border-subtle)] pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--rb-text-muted)]">
          Penetration Test Report
        </p>
        <div className="mt-2">
          <EditableReportTitle reportId={reportId} value={reportTitle} />
        </div>
      </header>

      {editable && <BlockHoverHandle editor={editor} />}
      <EditorContent editor={editor} className="rb-editor-root" />
    </div>
  );
}


function BlockHoverHandle({ editor }: { editor: Editor | null }): JSX.Element | null {
  const [pos, setPos] = useState<{ top: number; left: number; nodePos: number | null }>({
    top: -9999,
    left: -9999,
    nodePos: null,
  });

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onMove = (e: MouseEvent) => {
      const editorRect = dom.getBoundingClientRect();
      const target = (e.target as Element | null)?.closest(
        'p, h1, h2, h3, ul, ol, blockquote, pre, hr',
      );
      if (!target || !dom.contains(target)) {
        setPos((p) => ({ ...p, nodePos: null, top: -9999, left: -9999 }));
        return;
      }
      const rect = target.getBoundingClientRect();
      const nodePos = editor.view.posAtDOM(target, 0);
      setPos({
        top: rect.top - editorRect.top + 4,
        left: rect.left - editorRect.left - 22,
        nodePos,
      });
    };
    const onLeave = () => setPos({ top: -9999, left: -9999, nodePos: null });
    dom.addEventListener('mousemove', onMove);
    dom.addEventListener('mouseleave', onLeave);
    return () => {
      dom.removeEventListener('mousemove', onMove);
      dom.removeEventListener('mouseleave', onLeave);
    };
  }, [editor]);

  if (!editor || pos.nodePos === null) return null;

  return (
    <button
      type="button"
      aria-label="Block actions"
      title="Drag to reorder · Click for actions"
      className="rb-block-handle"
      style={{ position: 'absolute', top: pos.top, left: pos.left }}
      onClick={() => {
        if (pos.nodePos !== null) {
          editor.chain().focus().setNodeSelection(pos.nodePos).deleteSelection().run();
        }
      }}
    >
      <span aria-hidden>⋮⋮</span>
    </button>
  );
}

// Single-transaction reorder so undo history and selection survive.
function moveBlock(editor: Editor, direction: -1 | 1): void {
  const { state } = editor;
  const { $from } = state.selection;
  const doc = state.doc;

  let nodeIdx = -1;
  let nodeStart = 0;
  let runningPos = 0;
  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i);
    const start = runningPos;
    const end = runningPos + child.nodeSize;
    if ($from.pos >= start && $from.pos <= end) {
      nodeIdx = i;
      nodeStart = start;
      break;
    }
    runningPos = end;
  }
  if (nodeIdx === -1) return;
  const target = nodeIdx + direction;
  if (target < 0 || target >= doc.childCount) return;

  const node = doc.child(nodeIdx);
  const tr = state.tr;

  if (direction === -1) {
    const prev = doc.child(target);
    let prevStart = 0;
    for (let i = 0; i < target; i++) prevStart += doc.child(i).nodeSize;
    tr.delete(nodeStart, nodeStart + node.nodeSize);
    tr.insert(prevStart, node);
    void prev;
  } else {
    const next = doc.child(target);
    const nextEnd = nodeStart + node.nodeSize + next.nodeSize;
    tr.insert(nextEnd, node);
    tr.delete(nodeStart, nodeStart + node.nodeSize);
  }

  editor.view.dispatch(tr.scrollIntoView());
}
