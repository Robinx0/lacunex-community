import { useEffect } from 'react';
import { useUiStore } from '@/stores/uiStore';

/**
 * Mirrors the Zustand `theme` value onto `document.documentElement.dataset.theme`.
 * The CSS in `editor-themes.css` keys off this attribute, so a single subscription
 * keeps the entire app in sync.
 */
export function useApplyTheme(): void {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
}
