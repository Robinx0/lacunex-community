import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@': resolve(__dirname, 'src/renderer'),
    },
  },
  test: {
    // Per-file environment: `.tsx` tests get jsdom (DOM globals available
    // for React component tests); everything else stays in `node` for the
    // service / migration / IPC suites that don't want DOM globals
    // monkey-patched onto the runner.
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/**/*.test.tsx', 'jsdom'],
      ['src/**/*.test.tsx', 'jsdom'],
    ],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'src/**/*.test.ts'],
    globals: false,
  },
});
