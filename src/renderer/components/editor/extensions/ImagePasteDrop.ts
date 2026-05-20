import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

// Paste or drag-drop an image file into the editor and insert it as a
// screenshot block. The host (BlockEditor) supplies `getReportId` and
// `upload` so this extension has no IPC dependencies.

export interface ImageUploadInput {
  reportId: string;
  filename: string;
  mimetype: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  /** Raw base64 payload, no `data:` prefix. */
  base64: string;
}

export interface ImagePasteDropOptions {
  getReportId: () => string | null;
  /** Resolves to the created attachment id, or null on failure. */
  upload: (input: ImageUploadInput) => Promise<string | null>;
  onError?: (message: string) => void;
}

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

function pickMime(rawType: string): ImageUploadInput['mimetype'] {
  if (ALLOWED_MIME.has(rawType)) return rawType as ImageUploadInput['mimetype'];
  return 'image/png';
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

async function uploadAndInsert(
  view: EditorView,
  file: File,
  opts: ImagePasteDropOptions,
): Promise<void> {
  const reportId = opts.getReportId();
  if (!reportId) {
    opts.onError?.('Select a report first.');
    return;
  }
  const nodeType = view.state.schema.nodes['screenshot'];
  if (!nodeType) return;

  let base64: string;
  try {
    base64 = await fileToBase64(file);
  } catch {
    opts.onError?.('Could not read the image file.');
    return;
  }

  const attachmentId = await opts.upload({
    reportId,
    filename: file.name || 'pasted-image.png',
    mimetype: pickMime(file.type),
    base64,
  });
  if (!attachmentId) {
    opts.onError?.('Image upload failed.');
    return;
  }

  const node = nodeType.create({
    attachmentId,
    caption: '',
    figure: '?',
  });
  view.dispatch(view.state.tr.replaceSelectionWith(node));
}

const KEY = new PluginKey('imagePasteDrop');

export const ImagePasteDrop = Extension.create<ImagePasteDropOptions>({
  name: 'imagePasteDrop',

  addOptions() {
    return {
      getReportId: () => null,
      upload: async () => null,
      onError: () => undefined,
    };
  },

  addProseMirrorPlugins() {
    const opts = this.options;
    return [
      new Plugin({
        key: KEY,
        props: {
          handlePaste(view, event) {
            const items = Array.from(event.clipboardData?.items ?? []);
            const fileItem = items.find(
              (it) => it.kind === 'file' && it.type.startsWith('image/'),
            );
            if (!fileItem) return false;
            const file = fileItem.getAsFile();
            if (!file) return false;
            event.preventDefault();
            void uploadAndInsert(view, file, opts);
            return true;
          },

          handleDrop(view, event) {
            const files = Array.from(event.dataTransfer?.files ?? []);
            const imageFile = files.find((f) => f.type.startsWith('image/'));
            if (!imageFile) return false;
            event.preventDefault();
            const pos = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            if (pos) {
              const $pos = view.state.doc.resolve(pos.pos);
              view.dispatch(view.state.tr.setSelection(TextSelection.near($pos)));
            }
            void uploadAndInsert(view, imageFile, opts);
            return true;
          },
        },
      }),
    ];
  },
});
