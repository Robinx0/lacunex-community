import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';

const LANGS = [
  'http',
  'bash',
  'sh',
  'powershell',
  'python',
  'javascript',
  'typescript',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'rust',
  'sql',
  'json',
  'yaml',
  'xml',
  'plaintext',
];

export function CodeBlockView({ node, updateAttributes }: NodeViewProps): JSX.Element {
  const [copied, setCopied] = useState(false);
  const lang = (node.attrs.language as string) ?? 'http';

  const onCopy = () => {
    const text = node.textContent;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <NodeViewWrapper className="rb-code-wrap">
      <div className="rb-code-head" contentEditable={false}>
        <select
          value={lang}
          onChange={(e) => updateAttributes({ language: e.target.value })}
          aria-label="Code language"
          className="rb-code-lang"
        >
          {LANGS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <button type="button" onClick={onCopy} className="rb-code-copy" aria-label="Copy code">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="rb-code">
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
