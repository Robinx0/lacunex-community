import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { PocView } from '../views/PocView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    poc: {
      setPoc: () => ReturnType;
    };
  }
}

/**
 * Numbered reproduction-steps block. The steps are stored as a string array
 * on the node's attrs (each step is plain text). We keep them as attrs rather
 * than nested nodes because reorderable list-items are awkward in Tiptap and
 * the bridge serialization stays clean.
 */
export const PocNode = Node.create({
  name: 'pocSteps',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      steps: { default: ['Step 1: ', 'Step 2: '] as string[] },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-rb-poc]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-rb-poc': '' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PocView);
  },

  addCommands() {
    return {
      setPoc:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { steps: ['Step 1: …', 'Step 2: …'] },
          }),
    };
  },
});
