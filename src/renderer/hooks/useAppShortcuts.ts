import { useUiStore } from '@/stores/uiStore';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

/**
 * Top-level keyboard shortcuts. ⌘\ / ⌘. flip sidebar/preview (handled by
 * `useKeyboardShortcuts`); ⌘E opens the export modal via the UI store.
 */
export function useAppShortcuts(): void {
  const openModal = useUiStore((s) => s.openModal);
  useKeyboardShortcuts({ onExport: () => openModal('export') });
}
