import { AppShell } from '@/components/layout/AppShell';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import { useAppShortcuts } from '@/hooks/useAppShortcuts';
import { useAppActions } from '@/hooks/useAppActions';
import { useAppZoom } from '@/hooks/useAppZoom';
import { useUserTemplateSlashItems } from '@/hooks/useUserTemplateSlashItems';
import { useActiveReport } from '@/hooks/useActiveReport';

/**
 * Composition root. The hooks here run in order, then we hand off to
 * AppShell for layout. All UI state (modals, finding panel, layout) lives
 * in `useUiStore`; all report data lives behind `useActiveReport`.
 */
export default function App(): JSX.Element {
  useApplyTheme();
  useUserTemplateSlashItems();
  useAppShortcuts();
  useAppActions();
  useAppZoom();
  const activeReport = useActiveReport();

  return <AppShell {...activeReport} />;
}
