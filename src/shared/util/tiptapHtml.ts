import { escapeHtml } from './text';

/**
 * Minimal Tiptap-JSON → HTML walker. Used by both the in-app preview
 * (`PaperPage`'s BlockOnPaper) and the export pipeline so list / mark
 * rendering is identical on screen and in the exported PDF. Pre-fix the
 * "exact same" preview vs. PDF requirement boiled down to: the preview's
 * BlockOnPaper used `extractTiptapText` (flattened to a single string,
 * losing all list structure), and the export's lists.ts mirrored that
 * mistake. Walking the JSON properly gives a real `<ul>/<ol>/<li>` tree
 * on both sides.
 */

interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TiptapNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: TiptapMark[];
  content?: TiptapNode[];
}

/** Parse a serialized Tiptap document JSON; tolerate junk. */
export function parseTiptapNode(content: string | undefined | null): TiptapNode | null {
  if (!content) return null;
  try {
    return JSON.parse(content) as TiptapNode;
  } catch {
    return null;
  }
}

/**
 * Render a Tiptap node's *inline* content (text runs + marks) to HTML.
 * Walks the children of a paragraph / heading / list-item and emits
 * `<strong>` / `<em>` / `<code>` / `<a>` for the marks Tiptap's
 * starter-kit + our Link extension produce.
 */
export function tiptapInlineToHtml(content: TiptapNode[] | undefined): string {
  if (!content) return '';
  return content
    .map((child) => {
      if (child.type === 'text') return wrapMarks(escapeHtml(child.text ?? ''), child.marks);
      if (child.type === 'hardBreak') return '<br>';
      // Unknown inline node — fall back to its text content if any.
      return tiptapInlineToHtml(child.content);
    })
    .join('');
}

function wrapMarks(html: string, marks: TiptapMark[] | undefined): string {
  if (!marks || marks.length === 0) return html;
  let out = html;
  for (const m of marks) {
    if (m.type === 'bold' || m.type === 'strong') out = `<strong>${out}</strong>`;
    else if (m.type === 'italic' || m.type === 'em') out = `<em>${out}</em>`;
    else if (m.type === 'code') out = `<code>${out}</code>`;
    else if (m.type === 'strike') out = `<s>${out}</s>`;
    else if (m.type === 'underline') out = `<u>${out}</u>`;
    else if (m.type === 'link') {
      const href = String(m.attrs?.['href'] ?? '');
      if (/^(https?:|mailto:)/i.test(href)) {
        out = `<a href="${escapeHtml(href)}">${out}</a>`;
      }
    }
  }
  return out;
}

/**
 * Render a bulletList / orderedList Tiptap node to HTML. Recurses into
 * nested lists naturally — a list-item can contain another list, which
 * is how Tiptap represents indented sub-bullets.
 */
export function tiptapListToHtml(node: TiptapNode): string {
  const isOrdered = node.type === 'orderedList';
  const tag = isOrdered ? 'ol' : 'ul';
  const items = (node.content ?? [])
    .filter((child) => child.type === 'listItem')
    .map((item) => `<li>${renderListItemChildren(item)}</li>`)
    .join('');
  return `<${tag}>${items}</${tag}>`;
}

function renderListItemChildren(item: TiptapNode): string {
  return (item.content ?? [])
    .map((child) => {
      if (child.type === 'paragraph') return tiptapInlineToHtml(child.content);
      if (child.type === 'bulletList' || child.type === 'orderedList') {
        return tiptapListToHtml(child);
      }
      return tiptapInlineToHtml([child]);
    })
    .join('');
}
