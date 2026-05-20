import { useEffect } from 'react';
import { Shield, ChevronRight } from 'lucide-react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import type { FindingStatus, Severity } from '@shared/types';
import { STATUS_LABELS } from '@shared/constants';
import { severityTheme } from '@/lib/severityTheme';
import { useUiStore } from '@/stores/uiStore';
import { newPrefixedId } from '@/lib/ids';

const newFindingNodeId = (): string => newPrefixedId('fn');


export function FindingView({ node, updateAttributes }: NodeViewProps): JSX.Element {
  const sev = (node.attrs.severity as Severity) ?? 'med';
  const status = (node.attrs.status as FindingStatus) ?? 'open';
  const sv = severityTheme(sev);

  // Self-heal: ensure every finding has a stable id so the panel can locate it.
  useEffect(() => {
    if (!node.attrs.findingNodeId) {
      updateAttributes({ findingNodeId: newFindingNodeId() });
    }
  }, [node.attrs.findingNodeId, updateAttributes]);

  const openPanel = () => {
    const id = (node.attrs.findingNodeId as string | null) ?? newFindingNodeId();
    if (!node.attrs.findingNodeId) updateAttributes({ findingNodeId: id });
    useUiStore.getState().openFinding(id);
  };

  return (
    <NodeViewWrapper
      className="rb-finding-card"
      style={{ borderLeft: `3px solid ${sv.color}` }}
    >
      <div className="rb-finding-card__head" contentEditable={false}>
        <div className="rb-finding-card__head-l">
          <Shield className="h-3.5 w-3.5" style={{ color: sv.color }} aria-hidden />
          <span className="rb-finding-card__id">{node.attrs.vulnId as string}</span>
          <span className="rb-finding-card__title">{node.attrs.title as string}</span>
        </div>
        <div className="rb-finding-card__head-r">
          <span className="rb-sev-pill" style={{ color: sv.color, background: sv.bg }}>
            {sv.label}
          </span>
          <button type="button" onClick={openPanel} className="rb-finding-card__open">
            Edit
            <ChevronRight className="h-3 w-3" aria-hidden />
          </button>
        </div>
      </div>

      <dl className="rb-finding-card__meta" contentEditable={false}>
        <div className="rb-finding-card__meta-cell">
          <dt>CVSS</dt>
          <dd>{(node.attrs.cvss as string) || '—'}</dd>
        </div>
        <div className="rb-finding-card__meta-cell">
          <dt>CWE</dt>
          <dd>{(node.attrs.cwe as string) || '—'}</dd>
        </div>
        <div className="rb-finding-card__meta-cell">
          <dt>Affected</dt>
          <dd>{(node.attrs.affected as string) || '—'}</dd>
        </div>
        <div className="rb-finding-card__meta-cell">
          <dt>Status</dt>
          <dd>{STATUS_LABELS[status]}</dd>
        </div>
      </dl>

      <p className="rb-finding-card__body" contentEditable={false}>
        {(node.attrs.body as string) || 'Click "Edit" to describe the vulnerability.'}
      </p>
    </NodeViewWrapper>
  );
}
