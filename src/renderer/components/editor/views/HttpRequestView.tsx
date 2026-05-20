import { ArrowLeftRight } from 'lucide-react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { BufferedTextarea } from '@/components/ui/BufferedInput';

function statusVar(status: number): { color: string; bg: string } {
  if (status >= 500) return { color: 'var(--rb-red)', bg: 'var(--rb-red-bg)' };
  if (status >= 400) return { color: 'var(--rb-orange)', bg: 'var(--rb-orange-bg)' };
  if (status >= 300) return { color: 'var(--rb-yellow)', bg: 'var(--rb-yellow-bg)' };
  if (status >= 200) return { color: 'var(--rb-green)', bg: 'var(--rb-green-bg)' };
  return { color: 'var(--rb-text-secondary)', bg: 'var(--rb-gray-bg)' };
}

function inferStatus(response: string): number {
  const m = /^HTTP\/[0-9.]+\s+(\d{3})/m.exec(response);
  return m ? Number(m[1]) : 200;
}

export function HttpRequestView({ node, updateAttributes }: NodeViewProps): JSX.Element {
  const request = (node.attrs.request as string) ?? '';
  const response = (node.attrs.response as string) ?? '';
  const status = (node.attrs.status as number | undefined) ?? inferStatus(response);
  const sv = statusVar(status);

  return (
    <NodeViewWrapper className="rb-http">
      <div className="rb-http__head" contentEditable={false}>
        <ArrowLeftRight className="h-3.5 w-3.5 text-[var(--rb-blue)]" aria-hidden />
        <span className="rb-http__title">HTTP request / response</span>
        <span className="ml-auto rb-http__status" style={{ color: sv.color, background: sv.bg }}>
          {status}
        </span>
      </div>
      <div className="rb-http__panes" contentEditable={false}>
        <BufferedTextarea
          className="rb-http__pane"
          value={request}
          onCommit={(v) => updateAttributes({ request: v })}
          spellCheck={false}
          aria-label="HTTP request"
        />
        <BufferedTextarea
          className="rb-http__pane"
          value={response}
          onCommit={(v) => updateAttributes({ response: v, status: inferStatus(v) })}
          spellCheck={false}
          aria-label="HTTP response"
        />
      </div>
    </NodeViewWrapper>
  );
}
