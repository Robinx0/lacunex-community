import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import type { Severity } from '@shared/types';
import { severityTheme } from '@/lib/severityTheme';

export function SeverityBadgeView({ node }: NodeViewProps): JSX.Element {
  const sev = (node.attrs.severity as Severity) ?? 'info';
  const s = severityTheme(sev);
  return (
    <NodeViewWrapper as="span" className="rb-inline-badge">
      <span
        className="rb-sev-pill"
        contentEditable={false}
        style={{ color: s.color, background: s.bg }}
      >
        {s.label}
      </span>
    </NodeViewWrapper>
  );
}
