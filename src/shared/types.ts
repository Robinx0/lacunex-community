export type Severity = 'crit' | 'high' | 'med' | 'low' | 'info';
export type FindingStatus = 'open' | 'triaged' | 'fixed' | 'risk_accepted' | 'wont_fix';

export type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bullet_list'
  | 'ordered_list'
  | 'list_item'
  | 'code_block'
  | 'callout'
  | 'quote'
  | 'divider'
  | 'finding'
  | 'screenshot'
  | 'poc'
  | 'cve'
  | 'asset_chip'
  | 'http_request'
  | 'severity_badge'
  | 'table'
  | 'toc'
  | 'page_break';

export interface Block {
  id: string;
  type: BlockType;
  position: number;
  content?: string;
  attrs?: Record<string, unknown>;
}

export interface ScopeItem {
  type: string;
  value: string;
  tagClass: 'orange' | 'blue' | 'green' | 'purple' | 'red' | 'gray';
}

export interface ReportMeta {
  project: string;
  client: string;
  docId: string;
  classification: string;
  reportVersion: string;
  engagementType: string;
  methodology: string;
  startDate: string;
  endDate: string;
  authors: string;
  reviewers: string;
  distribution: string;
  scope: ScopeItem[];
  outOfScope: string;
}

export interface CustomCover {
  name: string;
  html: string;
  css: string;
  js: string;
}

/**
 * Per-report cover knobs that work across every built-in cover but matter
 * most on the OSCP cover (logo above the OSCP mark, palette swap,
 * compact-vs-generous text scale). Optional fields with sensible
 * fallbacks so existing reports keep rendering byte-identical.
 */
export interface CoverOptions {
  /**
   * Inline data-URL of an optional logo image (PNG / JPG / SVG /
   * data:image/...). Stored inline so it travels with the report — no
   * disk attachment to lose track of. Capped at 256 KB by the form
   * upload control.
   */
  logoDataUrl: string | null;
  /** Logo width as a fraction of the cover width — clamped 0.05 … 0.45. */
  logoSize: number;
  /** Cover-text scale multiplier — clamped 0.7 … 1.3. 1 = factory. */
  textScale: number;
  /**
   * OSCP cover palette key. `null` falls back to the default crimson.
   * Maps to a `[data-cover-palette]` attribute on the cover root.
   */
  palette: 'crimson' | 'midnight' | 'forest' | 'royal' | 'graphite' | 'amber' | null;
}

export interface Finding {
  id: string;
  blockId: string;
  reportId: string;
  vulnId: string;
  title: string;
  severity: Severity;
  cvss?: string;
  cwe?: string;
  affected?: string;
  status: FindingStatus;
  body: string;
  pocSteps: string[];
  remediation: string;
  createdAt: number;
  updatedAt: number;
}

export interface Report {
  id: string;
  title: string;
  meta: ReportMeta;
  blocks: Block[];
  coverId: string;
  customCover: CustomCover;
  reportTheme: 'light' | 'dark';
  reportAccent: string | null;
  /** Cover-specific knobs (logo, palette, text scale). See `CoverOptions`. */
  coverOptions: CoverOptions;
  /**
   * When true, the renderer auto-prepends a Table of Contents derived
   * from h1/h2/h3 blocks. The TOC is generated on render — not stored as
   * a block — so it stays in sync with heading edits without an extra
   * "regenerate" step.
   */
  tocEnabled: boolean;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
}

export interface ReportSummary {
  id: string;
  title: string;
  /** Engagement doc ID — denormalized from meta.docId for sidebar display. */
  docId: string;
  /** Report version — denormalized from meta.reportVersion. */
  reportVersion: string;
  coverId: string;
  reportTheme: 'light' | 'dark';
  createdAt: number;
  updatedAt: number;
  archived: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  type: 'block' | 'section' | 'finding';
  blocks: Block[];
  createdAt: number;
  updatedAt: number;
  useCount: number;
}

export interface Attachment {
  id: string;
  reportId: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  createdAt: number;
}
