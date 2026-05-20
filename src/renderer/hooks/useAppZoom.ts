import { useEffect } from 'react';

// Application-level zoom with two zones:
//
//   userLevel ≤ SIDEBAR_CAP:  whole page zooms together via
//                              webFrame.setZoomLevel (chrome's
//                              native page zoom; layout preserved).
//
//   userLevel > SIDEBAR_CAP:  webFrame stays clamped at SIDEBAR_CAP
//                              and the excess is applied as CSS
//                              `zoom` on the editor <main> only, via
//                              the `--rb-editor-extra-zoom` custom
//                              property. Sidebars stop growing past
//                              the cap so they remain compact.
//
// Bindings:
//   Ctrl/Cmd + =       zoom in
//   Ctrl/Cmd + -       zoom out
//   Ctrl/Cmd + 0       reset
//   Ctrl/Cmd + wheel   continuous
//
// On window resize, if the current zoom would crowd the editor below
// a readable width, the hook eases the user level back to a fit.

const LEVEL_MIN = -3;       // ≈ 75%
const LEVEL_MAX = 12;       // editor extra-zoom can go very high
const SIDEBAR_CAP = 1.5;    // ≈ 120% — sidebars stop growing past here
const STEP = 0.5;
const ANIM_MS = 120;
const WHEEL_SENSITIVITY = 0.004;
const FACTOR_PER_LEVEL = 1.2;
const MIN_EDITOR_PX_AT_100 = 720;

let userLevel = 0;
let animToken = 0;

function zoomFactorFromLevel(level: number): number {
  return Math.pow(FACTOR_PER_LEVEL, level);
}

function apply(level: number): void {
  const z = window.lacunex?.zoom;
  if (!z) return;
  userLevel = level;
  const pageLevel = Math.max(LEVEL_MIN, Math.min(SIDEBAR_CAP, level));
  z.set(pageLevel);
  const extra = level > SIDEBAR_CAP ? zoomFactorFromLevel(level - SIDEBAR_CAP) : 1;
  document.documentElement.style.setProperty(
    '--rb-editor-extra-zoom',
    String(extra),
  );
}

function animateTo(target: number): void {
  const clamped = Math.max(LEVEL_MIN, Math.min(LEVEL_MAX, target));
  const start = userLevel;
  if (Math.abs(start - clamped) < 1e-4) return;

  const token = ++animToken;
  const t0 = performance.now();
  const tick = (now: number): void => {
    if (token !== animToken) return;
    const t = Math.min(1, (now - t0) / ANIM_MS);
    const eased = 1 - Math.pow(1 - t, 3);
    apply(start + (clamped - start) * eased);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Best-effort: rough estimate of available editor width given the
// current sidebar/preview widths and the sidebar's effective zoom.
// We don't measure DOM here (called on every resize) — instead we
// pick a conservative threshold and trust the user to nudge.
function maxLevelForViewport(): number {
  const w = window.innerWidth;
  if (w < 900) return SIDEBAR_CAP - 0.5;
  if (w < 1200) return SIDEBAR_CAP + 1;
  if (w < 1700) return SIDEBAR_CAP + 3;
  if (w < 2200) return SIDEBAR_CAP + 5;
  return LEVEL_MAX;
}

function fitToViewport(): void {
  const cap = maxLevelForViewport();
  if (userLevel > cap) animateTo(cap);
  // Don't auto-grow on resize — only constrain. Growing would feel
  // jumpy to a user who deliberately picked a smaller size.
  void MIN_EDITOR_PX_AT_100;
}

export function useAppZoom(): void {
  useEffect(() => {
    const z = window.lacunex?.zoom;
    if (!z) return;

    // Pull whatever the engine starts at (usually 0) into our model.
    userLevel = z.get();
    apply(userLevel);

    const onKey = (e: KeyboardEvent): void => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        animateTo(Math.round((userLevel + STEP) / STEP) * STEP);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        animateTo(Math.round((userLevel - STEP) / STEP) * STEP);
      } else if (e.key === '0') {
        e.preventDefault();
        animateTo(0);
      }
    };

    const onWheel = (e: WheelEvent): void => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      animToken++;
      apply(
        Math.max(LEVEL_MIN, Math.min(LEVEL_MAX, userLevel + -e.deltaY * WHEEL_SENSITIVITY)),
      );
    };

    const onResize = (): void => fitToViewport();

    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
    };
  }, []);
}
