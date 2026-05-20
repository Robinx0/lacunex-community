import { z } from 'zod';

/* =============================================================================
   PRIMITIVE SCHEMAS
============================================================================= */

export const SeveritySchema = z.enum(['crit', 'high', 'med', 'low', 'info']);
export const FindingStatusSchema = z.enum([
  'open',
  'triaged',
  'fixed',
  'risk_accepted',
  'wont_fix',
]);

export const BlockTypeSchema = z.enum([
  'paragraph',
  'heading_1',
  'heading_2',
  'heading_3',
  'bullet_list',
  'ordered_list',
  'list_item',
  'code_block',
  'callout',
  'quote',
  'divider',
  'finding',
  'screenshot',
  'poc',
  'cve',
  'asset_chip',
  'http_request',
  'severity_badge',
  'table',
  'toc',
  'page_break',
]);

export const ScopeItemSchema = z.object({
  type: z.string(),
  value: z.string(),
  tagClass: z.enum(['orange', 'blue', 'green', 'purple', 'red', 'gray']),
});

export const ReportMetaSchema = z.object({
  project: z.string(),
  client: z.string(),
  docId: z.string(),
  classification: z.string(),
  reportVersion: z.string(),
  engagementType: z.string(),
  methodology: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  authors: z.string(),
  reviewers: z.string(),
  distribution: z.string(),
  scope: z.array(ScopeItemSchema),
  outOfScope: z.string(),
});

export const CustomCoverSchema = z.object({
  name: z.string(),
  html: z.string(),
  css: z.string(),
  js: z.string(),
});

export const CoverOptionsSchema = z.object({
  logoDataUrl: z.string().nullable(),
  logoSize: z.number().min(0.05).max(0.45),
  textScale: z.number().min(0.7).max(1.3),
  palette: z
    .enum(['crimson', 'midnight', 'forest', 'royal', 'graphite', 'amber'])
    .nullable(),
});

export const BlockSchema = z.object({
  id: z.string(),
  type: BlockTypeSchema,
  position: z.number().int().nonnegative(),
  content: z.string().optional(),
  attrs: z.record(z.string(), z.unknown()).optional(),
});

export const ReportSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  /** Engagement document ID — denormalized from meta.docId for sidebar display. */
  docId: z.string(),
  /** Report version string — denormalized from meta.reportVersion for sidebar display. */
  reportVersion: z.string(),
  coverId: z.string(),
  reportTheme: z.enum(['light', 'dark']),
  createdAt: z.number(),
  updatedAt: z.number(),
  archived: z.boolean(),
});

export const ReportSchema = z.object({
  id: z.string(),
  title: z.string(),
  meta: ReportMetaSchema,
  blocks: z.array(BlockSchema),
  coverId: z.string(),
  customCover: CustomCoverSchema,
  reportTheme: z.enum(['light', 'dark']),
  reportAccent: z.string().nullable(),
  coverOptions: CoverOptionsSchema,
  tocEnabled: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  archived: z.boolean(),
});

export const FindingSchema = z.object({
  id: z.string(),
  blockId: z.string(),
  reportId: z.string(),
  vulnId: z.string(),
  title: z.string(),
  severity: SeveritySchema,
  cvss: z.string().optional(),
  cwe: z.string().optional(),
  affected: z.string().optional(),
  status: FindingStatusSchema,
  body: z.string(),
  pocSteps: z.array(z.string()),
  remediation: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  icon: z.string(),
  type: z.enum(['block', 'section', 'finding']),
  blocks: z.array(BlockSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
  useCount: z.number().int().nonnegative(),
});

/* =============================================================================
   IPC INPUTS / OUTPUTS
============================================================================= */

export const ReportListInput = z.object({ archived: z.boolean().optional() });
export const ReportListOutput = z.array(ReportSummarySchema);

export const ReportGetInput = z.object({ id: z.string() });
export const ReportGetOutput = ReportSchema.nullable();

export const ReportCreateInput = z.object({
  title: z.string().min(1).max(200),
  fromTemplateId: z.string().optional(),
  meta: ReportMetaSchema.partial().optional(),
  coverId: z.string().optional(),
  customCover: CustomCoverSchema.optional(),
  reportTheme: z.enum(['light', 'dark']).optional(),
  reportAccent: z.string().nullable().optional(),
  coverOptions: CoverOptionsSchema.partial().optional(),
  tocEnabled: z.boolean().optional(),
});
export const ReportCreateOutput = ReportSchema;

/**
 * `reports.update` accepts either:
 *  - `blocks` — full replacement (for non-keystroke flows: cover swap,
 *    template insert, panel mutations)
 *  - `blocksUpsert` + `blocksDelete` — incremental autosave path; main
 *    only writes the changed rows. Sending the full block list every
 *    keystroke was the dominant IPC payload before this — a 5 MB report
 *    paid 5 MB per save. Diff-based saves drop that to <1 KB.
 *
 * If both are set, full `blocks` wins.
 */
export const ReportUpdateInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  meta: ReportMetaSchema.optional(),
  coverId: z.string().optional(),
  customCover: CustomCoverSchema.optional(),
  reportTheme: z.enum(['light', 'dark']).optional(),
  reportAccent: z.string().nullable().optional(),
  coverOptions: CoverOptionsSchema.optional(),
  tocEnabled: z.boolean().optional(),
  archived: z.boolean().optional(),
  blocks: z.array(BlockSchema).optional(),
  blocksUpsert: z.array(BlockSchema).optional(),
  blocksDelete: z.array(z.string()).optional(),
});
export const ReportUpdateOutput = ReportSchema;

export const ReportDeleteInput = z.object({ id: z.string() });
export const ReportDeleteOutput = z.object({ ok: z.literal(true) });

export const ReportDuplicateInput = z.object({ id: z.string() });
export const ReportDuplicateOutput = ReportSchema;

export const TemplateListInput = z.object({ category: z.string().optional() }).optional();
export const TemplateListOutput = z.array(TemplateSchema);

export const TemplateCreateInput = TemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  useCount: true,
});
export const TemplateCreateOutput = TemplateSchema;

export const TemplateDeleteInput = z.object({ id: z.string() });
export const TemplateDeleteOutput = z.object({ ok: z.literal(true) });

export const FindingSearchInput = z.object({ query: z.string() });
export const FindingSearchOutput = z.array(FindingSchema);

// Strict report-id pattern. Main mints `r_${nanoid(10)}` (12 chars,
// alphabet A-Za-z0-9_-). Any value flowing into a filesystem path
// (attachment dir) must match this — see AttachmentService for the
// on-disk containment check.
export const ReportIdSchema = z
  .string()
  .regex(/^r_[A-Za-z0-9_-]{1,40}$/, 'invalid report id');

export const AttachmentSchema = z.object({
  id: z.string(),
  reportId: ReportIdSchema,
  filename: z.string(),
  filepath: z.string(),
  mimetype: z.string(),
  size: z.number(),
  createdAt: z.number(),
});

/**
 * Allow only image attachments — pentest reports embed screenshots and
 * the renderer-side preview only knows how to render images. Locking the
 * MIME list here doubles as a defense-in-depth XSS gate: a hostile
 * `text/html` upload can't be served back through `attachments.get` for
 * a future `<iframe src>` to render.
 */
export const ALLOWED_ATTACHMENT_MIMES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
] as const;

/** ~25 MB raw → base64 inflates ~33%, so the wire cap is ~33 MB. */
export const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
export const ATTACHMENT_MAX_BASE64_LENGTH = Math.ceil((ATTACHMENT_MAX_BYTES * 4) / 3);

export const AttachmentUploadInput = z.object({
  reportId: ReportIdSchema,
  filename: z.string().min(1).max(255),
  mimetype: z.enum(ALLOWED_ATTACHMENT_MIMES),
  base64: z.string().max(ATTACHMENT_MAX_BASE64_LENGTH, 'attachment exceeds size limit'),
});
export const AttachmentUploadOutput = AttachmentSchema;

export const AttachmentGetInput = z.object({ id: z.string() });
export const AttachmentGetOutput = z
  .object({ mimetype: z.string(), base64: z.string() })
  .nullable();

export const AttachmentDeleteInput = z.object({ id: z.string() });
export const AttachmentDeleteOutput = z.object({ ok: z.literal(true) });

// Four canonical export formats.
export const ExportFormatSchema = z.enum(['pdf', 'html', 'markdown', 'word']);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const ExportRunInput = z.object({
  reportId: z.string(),
  format: ExportFormatSchema,
  filename: z.string().min(1),
  options: z
    .object({
      includeCover: z.boolean().optional(),
      redactPii: z.boolean().optional(),
      /**
       * Opt-in beta: use the paged.js polyfill for PDF generation so
       * pagination is handled as discrete `<div class="pagedjs_page">`
       * objects (Word-style page-as-object model) instead of relying
       * on Chromium's auto-pagination of one flowing document. Slower
       * to render but produces more predictable per-page chrome,
       * margins, and page-break handling for long reports.
       */
      pagedLayout: z.boolean().optional(),
    })
    .optional(),
});
export const ExportRunOutput = z.object({
  format: ExportFormatSchema,
  /** Absolute path written on disk, or null when canceled. */
  filepath: z.string().nullable(),
  bytes: z.number(),
  mimetype: z.string(),
  filename: z.string(),
});

export const AiActionSchema = z.enum([
  'suggest_remediation',
  'improve_clarity',
  'summarize_section',
]);
export type AiAction = z.infer<typeof AiActionSchema>;

// AI calls always go to a local Ollama instance on 127.0.0.1. No cloud
// provider is wired in.
export const AiProviderSchema = z.literal('ollama');
export type AiProvider = z.infer<typeof AiProviderSchema>;

export const AiSettingsSchema = z.object({
  provider: AiProviderSchema,
  model: z.string(),
  /** Always false in CE; field retained for shared-shape compatibility. */
  apiKeyConfigured: z.boolean(),
  ollamaUrl: z.string().optional(),
});

export const AiSettingsGetInput = z.object({}).optional();
export const AiSettingsGetOutput = AiSettingsSchema;

export const AiSettingsSetInput = z.object({
  provider: AiProviderSchema.optional(),
  model: z.string().min(1),
  ollamaUrl: z.string().optional(),
});
export const AiSettingsSetOutput = AiSettingsSchema;

export const AiGenerateInput = z.object({
  action: AiActionSchema,
  context: z.string().min(1),
  maxTokens: z.number().int().positive().optional(),
});
export const AiGenerateOutput = z.object({
  text: z.string(),
  provider: AiProviderSchema,
  model: z.string(),
});

/**
 * Lightweight health probe for Ollama. Surfaces a structured reason so
 * the AI panel can render an actionable empty state instead of leaving
 * the user staring at "fetch failed".
 *
 * Reasons:
 *   - 'not-running'  Ollama daemon isn't reachable at the configured URL.
 *   - 'no-models'    Daemon is up but `/api/tags` returned an empty list.
 *   - 'invalid-url'  Stored URL is unparseable / not loopback.
 *   - 'unknown'      Something else went wrong (HTTP 5xx, parse error).
 */
export const AiCheckOllamaInput = z.object({}).optional();
export const AiCheckOllamaOutput = z.discriminatedUnion('available', [
  z.object({
    available: z.literal(true),
    /** First model name returned by /api/tags, useful for "ready, using <model>" UX. */
    sampleModel: z.string().optional(),
    /** All model names from /api/tags. May be empty when sampleModel is undefined. */
    models: z.array(z.string()),
    ollamaUrl: z.string(),
  }),
  z.object({
    available: z.literal(false),
    reason: z.enum(['not-running', 'no-models', 'invalid-url', 'unknown']),
    message: z.string(),
    ollamaUrl: z.string(),
  }),
]);

/**
 * Read-only: the resolved userData path. Lets the Settings modal show
 * the folder location without the side effect of `shell.openPath` —
 * `openUserDataFolder` does the actual reveal.
 */
export const AppGetUserDataPathInput = z.object({}).optional();
export const AppGetUserDataPathOutput = z.object({ path: z.string() });

/**
 * Reveal the userData directory (where SQLite, attachments, AI usage
 * log, and electron-store live) in the host OS's file explorer.
 */
export const AppOpenUserDataFolderInput = z.object({}).optional();
export const AppOpenUserDataFolderOutput = z.object({
  path: z.string(),
  opened: z.boolean(),
});

/**
 * Wipe persistent UI preferences (`localStorage` zustand store) and
 * reload the renderer. Reports, templates, attachments are NOT
 * touched — only theme, sidebar/preview widths, modal collapse state,
 * etc.
 */
export const AppResetUiPreferencesInput = z.object({}).optional();
export const AppResetUiPreferencesOutput = z.object({ ok: z.literal(true) });

/**
 * Open an OS file picker for `.md` / `.markdown` / `.txt` files and
 * return the chosen file's content + base filename. The renderer
 * turns that into a fresh report via the existing `reports.create`
 * + `reports.update(blocks=...)` flow.
 *
 * Output is discriminated by `picked` so the renderer can handle
 * "user cancelled the dialog" without thrashing through error
 * propagation.
 */
export const AppImportFileInput = z.object({}).optional();
export const AppImportFileOutput = z.discriminatedUnion('picked', [
  z.object({
    picked: z.literal(true),
    filename: z.string(),
    content: z.string(),
  }),
  z.object({ picked: z.literal(false) }),
]);

/* =============================================================================
   IPC ENVELOPE — every channel returns one of these from main → renderer.
============================================================================= */

export interface IpcSuccess<T> {
  ok: true;
  data: T;
}

export interface IpcFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type IpcResult<T> = IpcSuccess<T> | IpcFailure;

/* =============================================================================
   CHANNEL MANIFEST
============================================================================= */

export const ipcContracts = {
  'reports.list': { input: ReportListInput, output: ReportListOutput },
  'reports.get': { input: ReportGetInput, output: ReportGetOutput },
  'reports.create': { input: ReportCreateInput, output: ReportCreateOutput },
  'reports.update': { input: ReportUpdateInput, output: ReportUpdateOutput },
  'reports.delete': { input: ReportDeleteInput, output: ReportDeleteOutput },
  'reports.duplicate': { input: ReportDuplicateInput, output: ReportDuplicateOutput },

  'templates.list': { input: TemplateListInput, output: TemplateListOutput },
  'templates.create': { input: TemplateCreateInput, output: TemplateCreateOutput },
  'templates.delete': { input: TemplateDeleteInput, output: TemplateDeleteOutput },

  'findings.search': { input: FindingSearchInput, output: FindingSearchOutput },

  'attachments.upload': { input: AttachmentUploadInput, output: AttachmentUploadOutput },
  'attachments.get': { input: AttachmentGetInput, output: AttachmentGetOutput },
  'attachments.delete': { input: AttachmentDeleteInput, output: AttachmentDeleteOutput },

  'export.run': { input: ExportRunInput, output: ExportRunOutput },

  'ai.settingsGet': { input: AiSettingsGetInput, output: AiSettingsGetOutput },
  'ai.settingsSet': { input: AiSettingsSetInput, output: AiSettingsSetOutput },
  'ai.generate': { input: AiGenerateInput, output: AiGenerateOutput },
  'ai.checkOllama': { input: AiCheckOllamaInput, output: AiCheckOllamaOutput },

  'app.getUserDataPath': {
    input: AppGetUserDataPathInput,
    output: AppGetUserDataPathOutput,
  },
  'app.openUserDataFolder': {
    input: AppOpenUserDataFolderInput,
    output: AppOpenUserDataFolderOutput,
  },
  'app.resetUiPreferences': {
    input: AppResetUiPreferencesInput,
    output: AppResetUiPreferencesOutput,
  },
  'app.importFile': {
    input: AppImportFileInput,
    output: AppImportFileOutput,
  },
} as const;

export type IpcChannel = keyof typeof ipcContracts;

export type IpcInput<C extends IpcChannel> = z.infer<(typeof ipcContracts)[C]['input']>;
export type IpcOutput<C extends IpcChannel> = z.infer<(typeof ipcContracts)[C]['output']>;
