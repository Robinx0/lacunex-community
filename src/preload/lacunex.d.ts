import type { LacunexApi } from './index';

declare global {
  interface Window {
    lacunex: LacunexApi;
  }
}
