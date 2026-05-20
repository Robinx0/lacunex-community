/**
 * Text helpers shared by main and renderer. Pure functions only —
 * no DOM, no Node APIs.
 */

/**
 * Walks a Tiptap content JSON node tree and concatenates all `text` runs.
 * Handles nested marks transparently. Returns the empty string for null/
 * undefined input or for nodes with no text content.
 */
export function extractTiptapText(content: string | undefined | null): string {
  if (!content) return '';
  try {
    const parsed = JSON.parse(content) as TiptapNodeLike;
    return collectText(parsed);
  } catch {
    return content;
  }
}

interface TiptapNodeLike {
  text?: string;
  content?: TiptapNodeLike[];
}

function collectText(node: TiptapNodeLike): string {
  if (typeof node.text === 'string') return node.text;
  if (!Array.isArray(node.content)) return '';
  let out = '';
  for (const child of node.content) out += collectText(child);
  return out;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SLUG_TRIM = /^-+|-+$/g;
const SLUG_REPLACE = /[^a-z0-9]+/g;

export function slugify(s: string, maxLen = 64): string {
  return s.toLowerCase().replace(SLUG_REPLACE, '-').replace(SLUG_TRIM, '').slice(0, maxLen) || 'untitled';
}

/**
 * djb2 — fast, well-distributed string hash. Returns a base36 string so it
 * fits in URLs/filenames without needing extra encoding. Used for stable
 * deterministic block IDs.
 */
export function djb2(s: string): string {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}
