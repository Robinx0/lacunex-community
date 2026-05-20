import type { Severity } from '@shared/types';
import { SEVERITY_LABELS } from '@shared/constants';

export interface SeverityTheme {
  /** CSS variable reference for foreground/text. */
  color: string;
  /** CSS variable reference for tinted background. */
  bg: string;
  /** Human-readable label ("Critical" / "High" / …). */
  label: string;
  /** Compact 2–3 char code for dense UI ("CRT" / "HI" / "MD" / "LO" / "IF"). */
  code: string;
}

/**
 * Single source of truth for the severity → CSS variable mapping. Used by
 * FindingView, FindingPanel, SeverityBadgeView, SeverityStats, PaperPage,
 * and the body-paper renderer. Every severity surface should read from here.
 */
export const SEVERITY_THEME: Record<Severity, SeverityTheme> = {
  crit: { color: 'var(--rb-sev-crit)', bg: 'var(--rb-sev-crit-bg)', label: SEVERITY_LABELS.crit, code: 'CRT' },
  high: { color: 'var(--rb-sev-high)', bg: 'var(--rb-sev-high-bg)', label: SEVERITY_LABELS.high, code: 'HI' },
  med: { color: 'var(--rb-sev-med)', bg: 'var(--rb-sev-med-bg)', label: SEVERITY_LABELS.med, code: 'MD' },
  low: { color: 'var(--rb-sev-low)', bg: 'var(--rb-sev-low-bg)', label: SEVERITY_LABELS.low, code: 'LO' },
  info: { color: 'var(--rb-sev-info)', bg: 'var(--rb-sev-info-bg)', label: SEVERITY_LABELS.info, code: 'IF' },
};

export function severityTheme(sev: Severity | string | undefined | null): SeverityTheme {
  const key = (sev ?? 'info') as Severity;
  return SEVERITY_THEME[key] ?? SEVERITY_THEME.info;
}
