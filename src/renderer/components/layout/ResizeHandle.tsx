import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type ResizeEdge = 'left' | 'right' | 'top' | 'bottom';

export interface ResizeHandleProps {
  /**
   * Which pane the handle resizes — the handle is rendered on the
   * opposite edge of that pane.
   *
   *   'left'   → vertical handle on the right edge of the LEFT pane
   *              (sidebar). Drags X. Right-drag grows the pane.
   *   'right'  → vertical handle on the left edge of the RIGHT pane
   *              (preview / AI / Finding rail). Drags X. Left-drag
   *              grows the pane.
   *   'top'    → horizontal handle on the bottom edge of the TOP
   *              pane. Drags Y. Down-drag grows the pane.
   *   'bottom' → horizontal handle on the top edge of the BOTTOM
   *              pane (e.g. the sidebar's draft-progress strip).
   *              Drags Y. Up-drag grows the pane.
   */
  edge: ResizeEdge;
  /** Called continuously with the delta (positive = pane grew). */
  onResize: (delta: number) => void;
  className?: string;
}

const KEYBOARD_STEP = 16;

function isHorizontal(edge: ResizeEdge): boolean {
  return edge === 'top' || edge === 'bottom';
}

/**
 * 4 px-wide (or tall) drag handle between resizable panes. Supports
 * both vertical (left↔right) and horizontal (top↕bottom) orientations.
 * Uses pointer capture so the drag survives fast moves past the window
 * edge, listens for Esc to cancel mid-drag, and stashes/restores the
 * document body's cursor + userSelect rather than blindly clearing
 * them — so unmounting mid-drag never leaks a stuck cursor across the
 * whole UI.
 */
export function ResizeHandle({ edge, onResize, className }: ResizeHandleProps): JSX.Element {
  const horizontal = isHorizontal(edge);
  const [active, setActive] = useState(false);
  const startCoord = useRef(0);
  // Remember the total accumulated delta so we can roll back precisely
  // when the user hits Esc mid-drag.
  const accumulatedDelta = useRef(0);

  // Sign convention: delta is positive when the handle moves in the
  // direction that GROWS the controlled pane.
  const signFor = useCallback(
    (raw: number): number => {
      if (edge === 'left' || edge === 'top') return raw;
      // 'right' / 'bottom' panes grow when the handle moves toward
      // smaller coordinates (left or up).
      return -raw;
    },
    [edge],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      startCoord.current = horizontal ? e.clientY : e.clientX;
      accumulatedDelta.current = 0;
      setActive(true);
    },
    [horizontal],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (horizontal) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          // Up arrow → pane on bottom grows, pane on top shrinks.
          onResize(edge === 'bottom' ? KEYBOARD_STEP : -KEYBOARD_STEP);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          onResize(edge === 'bottom' ? -KEYBOARD_STEP : KEYBOARD_STEP);
        }
      } else {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onResize(edge === 'left' ? -KEYBOARD_STEP : KEYBOARD_STEP);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          onResize(edge === 'left' ? KEYBOARD_STEP : -KEYBOARD_STEP);
        }
      }
    },
    [edge, horizontal, onResize],
  );

  useEffect(() => {
    if (!active) return;
    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;

    const onMove = (e: PointerEvent) => {
      const coord = horizontal ? e.clientY : e.clientX;
      const raw = coord - startCoord.current;
      startCoord.current = coord;
      const signed = signFor(raw);
      accumulatedDelta.current += signed;
      onResize(signed);
    };
    const stop = () => setActive(false);
    const onCancelKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (accumulatedDelta.current !== 0) {
        onResize(-accumulatedDelta.current);
      }
      setActive(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('keydown', onCancelKey);
    document.body.style.cursor = horizontal ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      window.removeEventListener('keydown', onCancelKey);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
    };
  }, [active, horizontal, onResize, signFor]);

  return (
    // The W3C "Window Splitter" pattern (see WAI-ARIA Authoring Practices) puts
    // a role="separator" on the divider with tabIndex + keyboard handlers. The
    // jsx-a11y plugin classifies `separator` as non-interactive in its static
    // table, so we disable those two rules narrowly here.
    /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
    <div
      role="separator"
      aria-orientation={horizontal ? 'horizontal' : 'vertical'}
      aria-label="Resize panel"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={cn(
        'group relative shrink-0 outline-none transition-colors',
        horizontal
          ? // 4-px horizontal divider. Single-pixel ate user clicks
            // (the original bug report); 4 px is the standard "I can
            // grab this with the mouse without aiming pixel-perfectly"
            // size.
            'h-1 w-full cursor-row-resize bg-[var(--rb-border-subtle)] hover:bg-[var(--rb-blue)] focus-visible:bg-[var(--rb-blue)]'
          : 'w-px cursor-col-resize bg-[var(--rb-border-subtle)] hover:bg-[var(--rb-blue)] focus-visible:bg-[var(--rb-blue)]',
        active && 'bg-[var(--rb-blue)]',
        className,
      )}
    >
      {/* Hit-zone — extends beyond the visible divider on the OUTGOING
          side only. Deliberately does NOT extend into the controlled
          pane, otherwise it would steal clicks from interactive
          children inside that pane. Cursor is set explicitly here so
          it survives the span overlapping the parent — Chrome can
          otherwise inherit the wrong cursor when the topmost element
          is the span. */}
      <span
        aria-hidden
        className={
          horizontal
            ? 'absolute -top-2 left-0 h-2 w-full cursor-row-resize'
            : 'absolute -left-1.5 top-0 h-full w-3 cursor-col-resize'
        }
      />
    </div>
    /* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
  );
}
