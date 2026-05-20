// The eight editor themes. Each `id` matches the [data-theme="<id>"]
// selector in styles/editor-themes.css. `swatches` is used by the theme
// menu to show a small preview chip.
export interface EditorTheme {
  id: EditorThemeId;
  name: string;
  tagline: string;
  swatches: [string, string, string, string];
}

export type EditorThemeId =
  | 'notion-dark'
  | 'notion-light'
  | 'tactical'
  | 'solarized-dark'
  | 'dracula'
  | 'tokyo-night'
  | 'github-dark'
  | 'gruvbox-dark'
  | 'manuscript';

export const editorThemes: EditorTheme[] = [
  {
    id: 'notion-dark',
    name: 'Slate',
    tagline: 'Default · calm graphite + soft accents',
    swatches: ['#191919', '#2a2a2a', '#529cca', '#ff7369'],
  },
  {
    id: 'notion-light',
    name: 'Ivory',
    tagline: 'Daylight · warm off-white for review',
    swatches: ['#ffffff', '#f7f6f3', '#2383e2', '#e03e3e'],
  },
  {
    id: 'tactical',
    name: 'Tactical',
    tagline: 'Operator · cyan on jet black',
    swatches: ['#0a0c10', '#1a212b', '#62d4f5', '#ff4570'],
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    tagline: 'Warm dark · classic dev favorite',
    swatches: ['#002b36', '#073642', '#268bd2', '#dc322f'],
  },
  {
    id: 'dracula',
    name: 'Dracula',
    tagline: 'Purple & pink · iconic vibe',
    swatches: ['#282a36', '#44475a', '#bd93f9', '#ff5555'],
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    tagline: 'Soft blue-purple · modern & moody',
    swatches: ['#1a1b26', '#24283b', '#7aa2f7', '#f7768e'],
  },
  {
    id: 'github-dark',
    name: 'GitHub Dark',
    tagline: 'Code-host classic · familiar palette',
    swatches: ['#0d1117', '#161b22', '#58a6ff', '#f85149'],
  },
  {
    id: 'gruvbox-dark',
    name: 'Gruvbox Dark',
    tagline: 'Retro warmth · pastel earth tones',
    swatches: ['#282828', '#3c3836', '#83a598', '#fb4934'],
  },
  {
    id: 'manuscript',
    name: 'Manuscript',
    tagline: 'Cursive serif on aged paper',
    swatches: ['#f6f1e7', '#fbf8f1', '#92400e', '#b91c2b'],
  },
];

export const DEFAULT_THEME_ID: EditorThemeId = 'notion-dark';
