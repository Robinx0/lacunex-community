/// <reference types="vite/client" />

import type { LacunexApi } from '../preload';

declare global {
  interface Window {
    lacunex?: LacunexApi;
  }
}

export {};
