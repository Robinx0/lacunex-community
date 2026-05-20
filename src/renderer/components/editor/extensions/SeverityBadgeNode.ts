import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { SeverityBadgeView } from '../views/SeverityBadgeView';
import type { Severity } from '@shared/types';

export interface SeverityBadgeAttrs {
  severity: Severity;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    severityBadge: {
      insertSeverityBadge: (severity: Severity) => ReturnType;
    };
  }
}

/**
 * Inline severity pill — `[crit] [high] [med] [low] [info]`. Used inside
 * paragraphs, table cells, headings, etc.
 */
export const SeverityBadgeNode = Node.create({
  name: 'severityBadge',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      severity: {
        default: 'info' as Severity,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-rb-severity]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-rb-severity': '' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SeverityBadgeView);
  },

  addCommands() {
    return {
      insertSeverityBadge:
        (severity) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs: { severity } }).run(),
    };
  },
});
