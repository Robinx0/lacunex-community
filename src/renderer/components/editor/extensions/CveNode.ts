import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CveView } from '../views/CveView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cve: {
      insertCve: (cveId: string) => ReturnType;
    };
  }
}

// Inline CVE reference. Stores the CVE id; the view stubs the CVSS score.
// A real CVSS lookup would plug in here later.
export const CveNode = Node.create({
  name: 'cveBadge',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      cveId: { default: 'CVE-XXXX-XXXX' },
      cvss: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-rb-cve]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-rb-cve': '' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CveView);
  },

  addCommands() {
    return {
      insertCve:
        (cveId) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs: { cveId } }).run(),
    };
  },
});
