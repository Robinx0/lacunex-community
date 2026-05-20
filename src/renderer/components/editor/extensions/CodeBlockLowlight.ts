import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CodeBlockView } from '../views/CodeBlockView';

const lowlight = createLowlight(common);

/**
 * Replaces StarterKit's plain `codeBlock` with a lowlight-driven, language-
 * picking variant. Supports the "common" language preset (~30 languages
 * covering everything we'd want in a pentest report — bash, py, sh, js, ts,
 * java, c, cs, sql, http, json, xml, yaml, etc.).
 */
export const CodeBlockNode = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({
  lowlight,
  defaultLanguage: 'http',
  HTMLAttributes: { class: 'rb-code' },
});
