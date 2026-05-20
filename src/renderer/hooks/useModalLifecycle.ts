import { useEffect, useState } from 'react';

/**
 * Drive modal enter/exit animations from the parent's `open` prop.
 *
 * Without this hook, a modal that does `if (!open) return null` flashes
 * out of existence the instant the parent closes it — entrance
 * animation plays on mount, but exit is instant. With this hook the
 * modal stays mounted for `exitMs` after `open` flips false, giving
 * the `animate-out` utilities time to play before unmount.
 *
 * Usage:
 *
 *   const { mounted, phase } = useModalLifecycle(open);
 *   if (!mounted) return null;
 *   const panelAnim = phase === 'enter'
 *     ? 'animate-in fade-in-0 zoom-in-95 duration-150'
 *     : 'animate-out fade-out-0 zoom-out-95 duration-150';
 *   const backdropAnim = phase === 'enter'
 *     ? 'animate-in fade-in-0 duration-150'
 *     : 'animate-out fade-out-0 duration-150';
 *
 * The default `exitMs` matches the 150 ms duration the
 * `tailwindcss-animate` utilities default to. If you change one, change
 * both.
 */
export function useModalLifecycle(
  open: boolean,
  exitMs = 150,
): { mounted: boolean; phase: 'enter' | 'exit' } {
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<'enter' | 'exit'>(open ? 'enter' : 'exit');

  useEffect(() => {
    if (open) {
      setMounted(true);
      setPhase('enter');
      return;
    }
    if (!mounted) return;
    setPhase('exit');
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [open, mounted, exitMs]);

  return { mounted, phase };
}
