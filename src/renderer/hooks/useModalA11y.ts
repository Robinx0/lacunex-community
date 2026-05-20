import { useEffect, useRef, type RefObject } from 'react';

/**
 * Centralized modal accessibility behaviors so every overlay we ship has
 * the same baseline: body scroll lock, Tab focus trap, focus restore to
 * the previously-focused element on close. Without this, Tab walks out
 * of the modal into the editor underneath, the page scrolls behind a
 * full-screen overlay, and closing the modal leaves focus on the
 * `<body>` instead of the trigger that opened it.
 *
 * Pass the modal panel's ref (the inner content, not the backdrop) and
 * a boolean `open` flag. The hook no-ops when closed.
 */
export function useModalA11y(
  containerRef: RefObject<HTMLElement | null>,
  open: boolean,
): void {
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Body scroll lock + focus management — runs only on the rising edge of
  // `open` so re-renders while open don't thrash document state.
  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current =
      (document.activeElement as HTMLElement | null) ?? null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first focusable inside the panel (or the panel itself).
    const node = containerRef.current;
    if (node) {
      const first = node.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? node).focus({ preventScroll: true });
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      // Restore focus to whatever held it before the modal opened. Defer
      // to the next tick so any sibling cleanup (e.g. a closing animation
      // unmounting an inner button) doesn't yank focus first.
      const restore = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (restore && document.contains(restore)) {
        queueMicrotask(() => restore.focus({ preventScroll: true }));
      }
    };
  }, [open, containerRef]);

  // Tab trap — capture-phase keydown so the contained handlers don't get
  // a chance to swallow the event first.
  useEffect(() => {
    if (!open) return;
    const node = containerRef.current;
    if (!node) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(isVisible);
      if (focusables.length === 0) {
        e.preventDefault();
        node.focus({ preventScroll: true });
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !node.contains(active)) {
          e.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else {
        if (active === last || !node.contains(active)) {
          e.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, containerRef]);
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  'details>summary',
].join(',');

function isVisible(el: HTMLElement): boolean {
  // offsetParent === null catches `display:none` (and detached nodes); the
  // rect check is a cheap fallback for `visibility:hidden` containers.
  if (el.offsetParent === null && el.tagName !== 'BODY') {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
  }
  return true;
}
