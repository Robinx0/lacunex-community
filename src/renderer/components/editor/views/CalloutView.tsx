import { AlertTriangle, Info, OctagonAlert, CircleCheck } from 'lucide-react';
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import type { CalloutKind } from '../extensions/CalloutNode';

const KIND_VARS: Record<CalloutKind, { color: string; bg: string; Icon: typeof Info }> = {
  info: { color: 'var(--rb-blue)', bg: 'var(--rb-blue-bg)', Icon: Info },
  warn: { color: 'var(--rb-yellow)', bg: 'var(--rb-yellow-bg)', Icon: AlertTriangle },
  danger: { color: 'var(--rb-red)', bg: 'var(--rb-red-bg)', Icon: OctagonAlert },
  success: { color: 'var(--rb-green)', bg: 'var(--rb-green-bg)', Icon: CircleCheck },
};

const KIND_OPTIONS: CalloutKind[] = ['info', 'warn', 'danger', 'success'];

export function CalloutView({ node, updateAttributes }: NodeViewProps): JSX.Element {
  const kind = (node.attrs.kind as CalloutKind) ?? 'info';
  const v = KIND_VARS[kind];
  const Icon = v.Icon;

  return (
    <NodeViewWrapper
      className="rb-callout"
      style={{
        background: v.bg,
        borderLeft: `2px solid ${v.color}`,
      }}
    >
      <div className="rb-callout__head" contentEditable={false}>
        <Icon className="rb-callout__icon" style={{ color: v.color }} aria-hidden />
        <input
          className="rb-callout__label"
          value={(node.attrs.label as string) ?? 'Note'}
          onChange={(e) => updateAttributes({ label: e.target.value })}
          aria-label="Callout label"
        />
        <select
          className="rb-callout__kind"
          value={kind}
          onChange={(e) => updateAttributes({ kind: e.target.value as CalloutKind })}
          aria-label="Callout kind"
        >
          {KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
      <NodeViewContent className="rb-callout__body" />
    </NodeViewWrapper>
  );
}
