import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * The renderer ships its palette as raw `var(--rb-*)` CSS custom properties
 * (see styles/editor-themes.css). Components reference them via Tailwind
 * arbitrary-value syntax — e.g. `bg-[var(--rb-bg-base)]`. We expose a couple
 * of friendly named tokens here so the most common spots stay readable, but
 * the full theme palette is intentionally not duplicated in this config.
 */
const config: Config = {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        sm: 'var(--rb-radius-sm)',
        DEFAULT: 'var(--rb-radius)',
        lg: 'var(--rb-radius-lg)',
        xl: 'var(--rb-radius-xl)',
      },
      fontFamily: {
        ui: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
        serif: ['EB Garamond', 'Iowan Old Style', 'Georgia', 'serif'],
      },
      boxShadow: {
        pop: 'var(--rb-shadow-pop)',
      },
    },
  },
  plugins: [animate],
};

export default config;
