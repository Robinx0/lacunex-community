import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

/**
 * Inputs whose `onChange` handler is expensive (Tiptap node markup
 * mutations, attribute writes that round-trip through the editor + autosave
 * pipeline) should not commit on every keystroke — typing stalls become
 * visible at ~50 blocks. These components buffer the value in local state
 * and call `onCommit` only on blur or when the buffered value is the same
 * across a 350 ms quiet window.
 *
 * Callers pass a `value` prop (the source of truth) and an `onCommit` —
 * never an `onChange`. When `value` changes externally (e.g. another
 * panel writes it, or undo/redo) the local draft resets to match.
 */

interface BufferedHandle {
  /** Imperatively flush any pending commit. Used by parents that close the surface. */
  flush: () => void;
}

const QUIET_FLUSH_MS = 350;

function useBuffered(
  value: string,
  onCommit: (next: string) => void,
): {
  draft: string;
  setDraft: (next: string) => void;
  commit: () => void;
  bumpQuietTimer: () => void;
} {
  const [draft, setDraft] = useState(value);
  const upstreamRef = useRef(value);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local draft when the upstream value changes underneath us.
  useEffect(() => {
    if (value !== upstreamRef.current && value !== draftRef.current) {
      upstreamRef.current = value;
      setDraft(value);
    } else {
      upstreamRef.current = value;
    }
  }, [value]);

  const commit = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (draftRef.current !== upstreamRef.current) {
      upstreamRef.current = draftRef.current;
      commitRef.current(draftRef.current);
    }
  }, []);

  const bumpQuietTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(commit, QUIET_FLUSH_MS);
  }, [commit]);

  // On unmount, flush any in-flight edits — otherwise closing a panel
  // mid-type silently discards what the user just typed.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (draftRef.current !== upstreamRef.current) {
        commitRef.current(draftRef.current);
      }
    };
  }, []);

  return { draft, setDraft, commit, bumpQuietTimer };
}

type InputBaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

export const BufferedInput = forwardRef<BufferedHandle, InputBaseProps & {
  value: string;
  onCommit: (next: string) => void;
}>(function BufferedInput({ value, onCommit, onBlur, ...rest }, ref) {
  const buf = useBuffered(value, onCommit);
  useImperativeHandle(ref, () => ({ flush: buf.commit }), [buf.commit]);
  return (
    <input
      {...rest}
      value={buf.draft}
      onChange={(e) => {
        buf.setDraft(e.target.value);
        buf.bumpQuietTimer();
      }}
      onBlur={(e) => {
        buf.commit();
        onBlur?.(e);
      }}
    />
  );
});

type TextareaBaseProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>;

export const BufferedTextarea = forwardRef<BufferedHandle, TextareaBaseProps & {
  value: string;
  onCommit: (next: string) => void;
}>(function BufferedTextarea({ value, onCommit, onBlur, ...rest }, ref) {
  const buf = useBuffered(value, onCommit);
  useImperativeHandle(ref, () => ({ flush: buf.commit }), [buf.commit]);
  return (
    <textarea
      {...rest}
      value={buf.draft}
      onChange={(e) => {
        buf.setDraft(e.target.value);
        buf.bumpQuietTimer();
      }}
      onBlur={(e) => {
        buf.commit();
        onBlur?.(e);
      }}
    />
  );
});
