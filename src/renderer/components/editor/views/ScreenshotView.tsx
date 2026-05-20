import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, Upload, X } from 'lucide-react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { ipc } from '@/lib/ipc';
import { useUiStore } from '@/stores/uiStore';

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export function ScreenshotView({
  node,
  updateAttributes,
  deleteNode,
}: NodeViewProps): JSX.Element {
  const attachmentId = (node.attrs.attachmentId as string | null) ?? null;
  const caption = (node.attrs.caption as string) ?? '';
  const figure = (node.attrs.figure as string) ?? '?';
  const reportId = useUiStore((s) => s.activeReportId);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!attachmentId) {
      setDataUrl(null);
      setLoadError(null);
      return;
    }
    setLoadError(null);
    ipc.attachments
      .get({ id: attachmentId })
      .then((res) => {
        if (cancelled) return;
        if (!res) {
          setLoadError('Attachment missing on disk');
          setDataUrl(null);
          return;
        }
        setDataUrl(`data:${res.mimetype};base64,${res.base64}`);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError((err as Error)?.message ?? 'Failed to load attachment');
        setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [attachmentId]);

  const handleFile = async (file: File) => {
    if (!reportId) return;
    setUploading(true);
    setLoadError(null);
    try {
      // Map browser-reported MIME (which can be empty or `image/svg+xml`)
      // to the IPC-accepted enum. Anything outside the allowlist falls
      // back to PNG since we re-encode on display anyway.
      const mimetype = (
        file.type === 'image/png' ||
        file.type === 'image/jpeg' ||
        file.type === 'image/gif' ||
        file.type === 'image/webp'
          ? file.type
          : 'image/png'
      ) as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
      const base64 = await fileToBase64(file);
      const attachment = await ipc.attachments.upload({
        reportId,
        filename: file.name,
        mimetype,
        base64,
      });
      updateAttributes({ attachmentId: attachment.id });
    } catch (err) {
      setLoadError((err as Error)?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const onDelete = (): void => deleteNode();

  return (
    <NodeViewWrapper className="rb-screenshot">
      {attachmentId && dataUrl ? (
        <figure>
          <div className="rb-screenshot__media" contentEditable={false}>
            <img src={dataUrl} alt={caption} />
            <button
              type="button"
              className="rb-screenshot__remove"
              onClick={onDelete}
              aria-label="Delete screenshot block"
              title="Delete screenshot block"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </div>
        </figure>
      ) : attachmentId && loadError ? (
        <div
          className="rb-screenshot__drop"
          contentEditable={false}
          role="alert"
          style={{ borderColor: 'var(--rb-red-bg)' }}
        >
          <AlertTriangle className="h-5 w-5 text-[var(--rb-red)]" aria-hidden />
          <span>Couldn&rsquo;t load attachment — {loadError}</span>
          <button
            type="button"
            className="rb-screenshot__remove"
            onClick={onDelete}
            aria-label="Delete screenshot block"
            title="Delete screenshot block"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="rb-screenshot__drop-wrap" contentEditable={false}>
          <button
            type="button"
            className={`rb-screenshot__drop ${dragOver ? 'is-over' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            {uploading ? (
              <>
                <Upload className="h-5 w-5 animate-pulse text-[var(--rb-blue)]" aria-hidden />
                <span>Uploading…</span>
              </>
            ) : (
              <>
                <Camera className="h-5 w-5 text-[var(--rb-text-muted)]" aria-hidden />
                <span>Click or drop an image to add a screenshot</span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </button>
          <button
            type="button"
            className="rb-screenshot__remove rb-screenshot__remove--empty"
            onClick={onDelete}
            aria-label="Delete screenshot block"
            title="Delete screenshot block"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </div>
      )}
      <figcaption className="rb-screenshot__caption" contentEditable={false}>
        <label className="rb-screenshot__figure">
          <span className="rb-screenshot__figure-prefix" aria-hidden>
            Fig&nbsp;
          </span>
          <input
            type="text"
            className="rb-screenshot__figure-input"
            value={figure}
            onChange={(e) => updateAttributes({ figure: e.target.value })}
            placeholder="?"
            aria-label="Figure number"
            size={Math.max(1, figure.length)}
          />
        </label>
        <input
          type="text"
          className="rb-screenshot__caption-input"
          value={caption}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          aria-label="Screenshot caption"
        />
      </figcaption>
    </NodeViewWrapper>
  );
}
