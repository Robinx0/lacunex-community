import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from './lib/query';
import App from './App';
import { queryClient } from './lib/queryClient';
import { DEFAULT_THEME_ID } from '@/lib/themes/editorThemes';
import './styles/globals.css';

// Apply the persisted theme to <html> before React mounts so the
// first paint isn't a FOUC. Reads localStorage directly to skip the
// Zustand store graph on the critical path.
function applyPersistedThemeSynchronously(): void {
  try {
    const raw = localStorage.getItem('lacunex.ui.v1');
    if (!raw) {
      document.documentElement.dataset['theme'] = DEFAULT_THEME_ID;
      return;
    }
    const parsed = JSON.parse(raw) as { state?: { theme?: string } };
    const theme = parsed.state?.theme ?? DEFAULT_THEME_ID;
    document.documentElement.dataset['theme'] = theme;
  } catch {
    document.documentElement.dataset['theme'] = DEFAULT_THEME_ID;
  }
}
applyPersistedThemeSynchronously();

const container = document.getElementById('root');
if (!container) {
  throw new Error('root element not found');
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
