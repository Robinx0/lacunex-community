import { useEffect, useState } from 'react';
import { Bug } from 'lucide-react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

export function CveView({ node, updateAttributes }: NodeViewProps): JSX.Element {
  const cveId = (node.attrs.cveId as string) ?? 'CVE-XXXX-XXXX';
  const stored = node.attrs.cvss as string | null | undefined;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(cveId);

  useEffect(() => setDraft(cveId), [cveId]);

  if (editing) {
    return (
      <NodeViewWrapper as="span" className="rb-inline-badge">
        <input
          contentEditable={false}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            updateAttributes({ cveId: draft.trim() || 'CVE-XXXX-XXXX' });
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              e.preventDefault();
              updateAttributes({ cveId: draft.trim() || 'CVE-XXXX-XXXX' });
              setEditing(false);
            }
          }}
          className="rb-cve-input"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="span" className="rb-inline-badge">
      <button
        type="button"
        contentEditable={false}
        onDoubleClick={() => setEditing(true)}
        className="rb-cve-pill"
        title="Double-click to edit"
      >
        <Bug className="h-3 w-3" aria-hidden />
        <span className="rb-cve-id">{cveId}</span>
        {stored && <span className="rb-cve-score">CVSS {stored}</span>}
      </button>
    </NodeViewWrapper>
  );
}
