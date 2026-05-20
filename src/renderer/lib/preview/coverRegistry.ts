import type { ComponentType } from 'react';
import type { CoverOptions, ReportMeta, CustomCover } from '@shared/types';
import { CoverBlackOps } from '@/components/preview/covers/CoverBlackOps';
import { CoverCorporate } from '@/components/preview/covers/CoverCorporate';
import { CoverMinimal } from '@/components/preview/covers/CoverMinimal';
import { CoverOscp } from '@/components/preview/covers/CoverOscp';
import { CoverSpine } from '@/components/preview/covers/CoverSpine';

export interface CoverProps {
  meta: ReportMeta;
  customCover?: CustomCover;
  /**
   * Per-report knobs that work across all covers. Most covers ignore
   * these; the OSCP cover honors `logoDataUrl`, `logoSize`, `textScale`,
   * and `palette`. Optional so existing call-sites compile, defaults
   * come from `ReportService.assembleReport`.
   */
  coverOptions?: CoverOptions;
}

export interface CoverEntry {
  id: string;
  name: string;
  tag: string;
  swatch: string;
  reportTheme: 'light' | 'dark';
  reportAccent: string;
  component: ComponentType<CoverProps>;
}

// Cover gallery. Internal IDs (blackops-*, corporate-*, minimal-*) are
// kept stable so existing reports' coverId references stay valid even
// when the display names change.
export const COVER_REGISTRY: CoverEntry[] = [
  {
    id: 'blackops-dark',
    name: 'Tradecraft · Dark',
    tag: 'Tactical · Cyan accent',
    swatch: '#0a0c10',
    reportTheme: 'dark',
    reportAccent: '#62d4f5',
    component: CoverBlackOps,
  },
  {
    id: 'blackops-light',
    name: 'Tradecraft · Light',
    tag: 'Tactical · Print-friendly',
    swatch: '#f4f3ee',
    reportTheme: 'light',
    reportAccent: '#0a3a5c',
    component: CoverBlackOps,
  },
  {
    id: 'corporate-light',
    name: 'Boardroom · Light',
    tag: 'Institutional · Navy',
    swatch: '#f5f3ed',
    reportTheme: 'light',
    reportAccent: '#1d3a5f',
    component: CoverCorporate,
  },
  {
    id: 'corporate-dark',
    name: 'Boardroom · Dark',
    tag: 'Institutional · Brass',
    swatch: '#14171c',
    reportTheme: 'dark',
    reportAccent: '#c9a86a',
    component: CoverCorporate,
  },
  {
    id: 'minimal-light',
    name: 'Vellum · Light',
    tag: 'Swiss · Off-white',
    swatch: '#fafaf7',
    reportTheme: 'light',
    reportAccent: '#0a0a0c',
    component: CoverMinimal,
  },
  {
    id: 'minimal-dark',
    name: 'Vellum · Dark',
    tag: 'Swiss · Deep neutral',
    swatch: '#0e0e10',
    reportTheme: 'dark',
    reportAccent: '#ededec',
    component: CoverMinimal,
  },
  {
    id: 'oscp-crimson',
    name: 'OSCP · Crimson',
    tag: 'Offensive Security · DC143C',
    swatch: '#dc143c',
    reportTheme: 'dark',
    reportAccent: '#dc143c',
    component: CoverOscp,
  },
  {
    id: 'spine-ink',
    name: 'Spine · Ink',
    tag: 'Generic exam · Cream + book-spine',
    swatch: '#10172a',
    reportTheme: 'light',
    reportAccent: '#10172a',
    component: CoverSpine,
  },
];

export const DEFAULT_COVER_ID = 'blackops-dark';

/** Map legacy or unknown cover ids to a registered fallback. */
const LEGACY_ID_ALIASES: Record<string, string> = {
  blackops: 'blackops-dark',
  corporate: 'corporate-light',
  minimal: 'minimal-light',
  aurora: 'blackops-dark',
  aerospace: 'blackops-dark',
  carbon: 'minimal-dark',
  crimson: 'corporate-light',
  manuscript: 'minimal-light',
  custom: 'minimal-light',
};

export function getCoverEntry(id: string): CoverEntry {
  const resolved = LEGACY_ID_ALIASES[id] ?? id;
  return COVER_REGISTRY.find((c) => c.id === resolved) ?? COVER_REGISTRY[0];
}

/** Empty default kept for type-shape compatibility with the shared
 *  Report schema. Custom-cover rendering is not exposed in the UI. */
export const DEFAULT_CUSTOM_COVER: CustomCover = {
  name: 'Custom cover',
  html: '',
  css: '',
  js: '',
};
