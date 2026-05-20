import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ScreenshotView } from '../views/ScreenshotView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    screenshot: {
      setScreenshot: () => ReturnType;
    };
  }
}

/**
 * Screenshot block. Stores the attachment id (resolved via IPC), figure
 * number, and caption. The view handles file drop + paste-to-upload.
 */
export const ScreenshotNode = Node.create({
  name: 'screenshot',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      attachmentId: { default: null as string | null },
      figure: { default: '?' as string },
      caption: { default: 'Caption text…' as string },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-rb-screenshot]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes({ 'data-rb-screenshot': '' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ScreenshotView);
  },

  addCommands() {
    return {
      setScreenshot:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});
