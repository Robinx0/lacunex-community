import type { Severity, FindingStatus } from './types';

export const SEVERITY_LABELS: Record<Severity, string> = {
  crit: 'Critical',
  high: 'High',
  med: 'Medium',
  low: 'Low',
  info: 'Informational',
};

export const SEVERITY_ORDER: Severity[] = ['crit', 'high', 'med', 'low', 'info'];

export const STATUS_LABELS: Record<FindingStatus, string> = {
  open: 'Open',
  triaged: 'Triaged',
  fixed: 'Fixed',
  risk_accepted: 'Risk Accepted',
  wont_fix: "Won't Fix",
};

export const APP_NAME = 'Lacunex Reports';
export const APP_ID = 'com.lacunex.reports';
