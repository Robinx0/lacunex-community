import { useEffect, useRef } from 'react';
import { useUiStore } from '@/stores/uiStore';

interface ShortcutHandlers {
  onExport?: () => void;
}

/**
 * Global keyboard shortcuts:
 *
 *   ⌘\ — toggle sidebar
 *   ⌘. — toggle preview
 *   ⌘K — open command palette (works even from inside an input)
 *   ⌘E — open export modal (skipped while focus is in an editable surface)
 *
 * Phase mode (⌘1/⌘2/⌘3) is owned by ModeStepper; theme picking is in
 * the topbar dropdown and the palette.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const togglePreview = useUiStore((s) => s.togglePreview);
  const openModal = useUiStore((s) => s.openModal);

  // Callers pass a fresh `handlers` object every render — keeping it in
  // a ref means the effect doesn't re-bind the global keydown listener
  // on every parent render (which is every Zustand state change).
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;

      if (e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      if (e.key === '.') {
        e.preventDefault();
        togglePreview();
        return;
      }
      if (e.key === 'k' || e.key === 'K') {
        // Always opens the palette — even from inside an input. Cmd+K is
        // industry-standard for "search/command" and overrides any
        // editor-local binding.
        e.preventDefault();
        openModal('commandPalette');
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        // Don't hijack ⌘E when an editable surface owns focus, since some
        // editors rely on it. The export button is also one click away.
        const target = e.target as HTMLElement | null;
        const editable =
          target?.isContentEditable ||
          target?.tagName === 'INPUT' ||
          target?.tagName === 'TEXTAREA';
        if (editable) return;
        e.preventDefault();
        handlersRef.current.onExport?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebar, togglePreview, openModal]);
}
