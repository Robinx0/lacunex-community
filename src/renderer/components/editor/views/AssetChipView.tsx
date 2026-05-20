import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import type { ScopeItem } from '@shared/types';

const TAG_VARS: Record<ScopeItem['tagClass'], string> = {
  orange: 'var(--rb-orange)',
  blue: 'var(--rb-blue)',
  green: 'var(--rb-green)',
  purple: 'var(--rb-purple)',
  red: 'var(--rb-red)',
  gray: 'var(--rb-text-secondary)',
};

export function AssetChipView({ node }: NodeViewProps): JSX.Element {
  const tagClass = (node.attrs.tagClass as ScopeItem['tagClass']) ?? 'gray';
  const color = TAG_VARS[tagClass] ?? TAG_VARS.gray;
  const t = (node.attrs.assetType as string) ?? 'Asset';
  const v = (node.attrs.assetValue as string) ?? '';
  return (
    <NodeViewWrapper as="span" className="rb-inline-badge">
      <span
        className="rb-asset-chip"
        contentEditable={false}
        style={{ color, borderColor: color }}
        title={`${t}: ${v}`}
      >
        <span className="rb-asset-chip__type">{t}</span>
        <span className="rb-asset-chip__value">{v}</span>
      </span>
    </NodeViewWrapper>
  );
}
