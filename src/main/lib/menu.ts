import { Menu } from 'electron';

/**
 * No application menu — all configuration lives in the renderer's
 * Settings modal (gear icon in the topbar). The previous File / View /
 * Help menus were either duplicates of existing UI (sidebar buttons,
 * topbar controls, Cmd+K palette) or stubs, so we removed them. Power
 * users can still access DevTools via Electron's default
 * `Ctrl+Shift+I` / `Cmd+Option+I` binding inherited from the
 * BrowserWindow webContents.
 *
 * On macOS, calling `setApplicationMenu(null)` causes the OS to fall
 * back to a minimal default menu (App name with Quit/Hide, plus
 * Edit for clipboard, Window, Help). That default is fine — it
 * provides the OS-required Cmd+Q and clipboard bindings without
 * cluttering the bar with our own decorative entries. We do NOT
 * customize it.
 */
export function installApplicationMenu(): void {
  Menu.setApplicationMenu(null);
}
