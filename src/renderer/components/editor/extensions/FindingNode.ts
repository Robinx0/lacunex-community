import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { FindingView } from '../views/FindingView';
import type { FindingStatus, Severity } from '@shared/types';

export interface FindingAttrs {
  vulnId: string;
  title: string;
  severity: Severity;
  cvss: string;
  cwe: string;
  affected: string;
  status: FindingStatus;
  body: string;
  pocSteps: string[];
  remediation: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    finding: {
      setFinding: (attrs?: Partial<FindingAttrs>) => ReturnType;
      openFinding: (id: string) => ReturnType;
    };
  }
}

// Block-level Finding card. The full editing surface lives in the
// right-rail FindingPanel. Clicking the card emits a custom
// `lacunex:open-finding` event that App.tsx listens for.
export const FindingNode = Node.create({
  name: 'finding',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      // Stable id used by the right-rail panel to locate the node — generated
      // lazily on first render if missing.
      findingNodeId: { default: null as string | null },
      vulnId: { default: 'NEW-001' },
      title: { default: 'New finding' },
      severity: { default: 'med' as Severity },
      cvss: { default: '5.0' },
      cwe: { default: 'CWE-XXX' },
      affected: { default: 'unspecified' },
      status: { default: 'open' as FindingStatus },
      body: { default: 'Describe the vulnerability and its impact.' },
      pocSteps: { default: ['Step 1: …', 'Step 2: …'] as string[] },
      remediation: { default: 'Describe how to fix this issue.' },
      /** Free-form tag list (authz, tenancy, api, …). Surfaced in the
       *  panel's TAGS chips and used for cross-engagement filtering. */
      tags: { default: [] as string[] },
    };
  },

  parseHTML() {
    return [{ tag: 'article[data-rb-finding]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['article', mergeAttributes({ 'data-rb-finding': '' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FindingView);
  },

  addCommands() {
    return {
      setFinding:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
      openFinding:
        (_id) =>
        () => {
          // No-op here. FindingView emits the CustomEvent that actually
          // opens the side panel.
          return true;
        },
    };
  },
});
