import { useEffect } from 'react';
import { useTemplateList } from './useTemplates';
import { setUserTemplateSlashItems } from '@/lib/editor/slashItems';

/**
 * Mirrors the TanStack Query templates list into the slashItems module-level
 * cache. The SlashCommands extension reads from that cache on every keystroke
 * so newly-saved templates show up in the menu immediately, without any
 * editor-instance remount.
 */
export function useUserTemplateSlashItems(): void {
  const list = useTemplateList();
  useEffect(() => {
    setUserTemplateSlashItems(list.data ?? []);
  }, [list.data]);
}
