import { useRef } from 'react';
import { nanoid } from 'nanoid';

/**
 * Maintain a stable per-slot key array that mirrors a value array. The
 * caller drives mutations through the returned helpers — `swap`, `add`,
 * `remove` — so the keys move with the items. Plain edits to a slot's
 * value don't require a key change and don't go through this hook.
 *
 * Why: list inputs that allow reorder fail when their `key` is the array
 * index. React preserves the DOM/state under each `key`, so swapping
 * indices means the focused `<input>` stays put while the value beneath
 * it changes — cursor jumps to the wrong row, IME composition breaks.
 *
 * Usage:
 *   const keys = useArrayKeys(items.length);
 *   items.map((it, i) => <input key={keys.read(i)} … />)
 *   onMoveUp:  () => { keys.swap(i, i-1); commit(swappedItems); }
 */
export function useArrayKeys(length: number): {
  read: (i: number) => string;
  swap: (a: number, b: number) => void;
  add: () => void;
  remove: (i: number) => void;
} {
  const keysRef = useRef<string[]>([]);

  // Resync length lazily on every read so external mutations to the
  // underlying value array (e.g. attr writes from elsewhere) stay safe.
  const ensure = () => {
    const ks = keysRef.current;
    while (ks.length < length) ks.push(nanoid(8));
    if (ks.length > length) ks.length = length;
  };

  // Methods are stable across renders by virtue of closing over `keysRef`
  // (a ref) and reading `length` indirectly via `ensure`. We don't need
  // useCallback — the consumers don't pass these into a memo deps list
  // that depends on identity stability across renders.
  const read = (i: number) => {
    ensure();
    return keysRef.current[i] ?? '';
  };
  const swap = (a: number, b: number) => {
    ensure();
    const ks = keysRef.current;
    if (a < 0 || b < 0 || a >= ks.length || b >= ks.length) return;
    [ks[a], ks[b]] = [ks[b], ks[a]];
  };
  const add = () => {
    ensure();
    keysRef.current.push(nanoid(8));
  };
  const remove = (i: number) => {
    ensure();
    keysRef.current.splice(i, 1);
  };

  return { read, swap, add, remove };
}
