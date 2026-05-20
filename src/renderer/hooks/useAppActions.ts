import { useEffect } from 'react';
import { useUiStore } from '@/stores/uiStore';

/**
 * Listen for `app:action` events from the main-process application
 * menu and dispatch them into the renderer's UI state. Wired once at
 * the App root via the preload bridge.
 *
 * The slim menu only fires `'openSettings'` and `'about'` today;
 * everything else lives in the existing UI (sidebar / topbar / Cmd+K).
 * The `AppAction` union still has the wider set so older menu builds
 * remain forward-compatible — actions we don't recognize are ignored.
 *
 * Also listens for `app:reset-ui-preferences` (a separate one-way
 * push from the Settings → Reset preferences flow) and clears
 * `localStorage` + reloads the renderer.
 */
export function useAppActions(): void {
  const openModal = useUiStore((s) => s.openModal);

  useEffect(() => {
    const bridge = typeof window !== 'undefined' ? window.lacunex : undefined;
    if (!bridge?.app) return;

    const unsubAction = bridge.app.onAction?.((action) => {
      switch (action) {
        case 'openSettings':
          openModal('settings');
          break;
        case 'about':
          // Handled in main via dialog.showMessageBox.
          break;
        default:
          // Forward-compatible: a newer main process can fire actions
          // an older renderer doesn't handle yet — silently ignore.
          break;
      }
    });

    const unsubReset = bridge.app.onResetUiPreferences?.(() => {
      try {
        localStorage.removeItem('lacunex.ui.v1');
      } catch {
        /* ignore */
      }
      // Hard reload so the cleared state is in effect immediately.
      window.location.reload();
    });

    return () => {
      unsubAction?.();
      unsubReset?.();
    };
  }, [openModal]);
}
