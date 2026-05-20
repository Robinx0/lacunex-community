import { nanoid } from 'nanoid';

/**
 * Single source of truth for client-side prefixed IDs. Two earlier
 * sites (FindingView + templateInsert) each kept their own
 * `_idCounter` module variable, which meant a finding self-heal and a
 * template insert running in the same millisecond could mint the same
 * `fn_…` value — low probability, but a real footgun for the FTS
 * index. Centralizing here also lets us swap the entropy source once
 * (e.g. crypto.randomUUID under Electron) without hunting callers.
 */
export function newPrefixedId(prefix: string): string {
  return `${prefix}_${nanoid(10)}`;
}
