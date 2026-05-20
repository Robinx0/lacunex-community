import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CalloutView } from '../views/CalloutView';

export type CalloutKind = 'info' | 'warn' | 'danger' | 'success';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (kind?: CalloutKind) => ReturnType;
    };
  }
}

/**
 * Block-level callout. Variants: info / warn / danger / success.
 * The body is editable (contains a paragraph).
 */
export const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      kind: { default: 'info' as CalloutKind },
      label: { default: 'Note' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-rb-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-rb-callout': '' }, HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      setCallout:
        (kind = 'info') =>
        ({ commands }) =>
          // ProseMirror's text node is non-empty by definition — emitting
          // `{ type: 'text', text: '' }` throws (or silently normalizes,
          // depending on schema version). An empty paragraph already
          // satisfies the `block+` content rule, so just skip the text
          // child entirely.
          commands.insertContent({
            type: this.name,
            attrs: { kind, label: kindLabel(kind) },
            content: [{ type: 'paragraph' }],
          }),
    };
  },
});

function kindLabel(kind: CalloutKind): string {
  switch (kind) {
    case 'warn':
      return 'Warning';
    case 'danger':
      return 'Danger';
    case 'success':
      return 'Success';
    default:
      return 'Note';
  }
}
