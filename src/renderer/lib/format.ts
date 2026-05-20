/**
 * Renderer-only format helpers — anything that takes a value and returns a
 * presentation string. Keep these stateless and pure so they're trivially
 * memoizable at call sites.
 */

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export function relativeTime(ts: number, now = Date.now()): string {
  const diff = now - ts;
  const abs = Math.abs(diff);
  if (abs < MIN) return 'just now';
  if (abs < HOUR) return `${Math.round(abs / MIN)}m ago`;
  if (abs < DAY) return `${Math.round(abs / HOUR)}h ago`;
  return `${Math.round(abs / DAY)}d ago`;
}

/**
 * Wall-clock HH:MM in the user's local timezone — used by the topbar's
 * "SAVED · 12:42" indicator.
 */
export function clockTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Compact word-count string — ".4k" / "1.2k" / "12k". Used by the outline
 * tree to surface document weight without taking horizontal space.
 */
export function compactWordCount(words: number): string {
  if (words >= 10_000) return `${Math.round(words / 1000)}k`;
  if (words >= 100) return `${(words / 1000).toFixed(1)}k`;
  return String(words);
}

/**
 * Estimate words in a string. Splits on whitespace; not lexically exact
 * but stable enough for the outline word-count display.
 */
export function countWords(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}
