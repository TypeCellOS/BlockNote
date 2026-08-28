import { useLayoutEffect, useState } from "react";

// The tallest layout-equivalent viewport height seen so far — our stand-in for
// "keyboard closed" — and the layout width it was measured at. Module scope so
// they survive re-renders; the height only ever grows within a given width, so
// refreshing it from a render pass is safe.
let maxLayoutViewportHeight = 0;
let baselineLayoutWidth = 0;

/**
 * Whether the on-screen keyboard is open, from the current visual viewport. We
 * compare `height * scale` — the zoom-invariant layout-equivalent height, so
 * pinch-zoom (which also shrinks `height`) doesn't count — against the tallest
 * value seen, treating a drop of more than 150px as open: comfortably above
 * URL-bar show/hide (~60-100px) and below any real keyboard (~250px+).
 *
 * The keyboard never changes the viewport width, but an orientation change
 * does — so when the width changes we reset the baseline, otherwise a shorter
 * landscape viewport would be mistaken for an open keyboard.
 *
 * We read the width from `document.documentElement.clientWidth` — the layout
 * viewport, which pinch-zoom and the keyboard both leave untouched on iOS and
 * Android alike. (`window.innerWidth` and `visualViewport.width * scale` both
 * track the *visual* viewport on Android/Chrome, so they wobble by a few
 * percent as you pinch.) And we only reset on a *large* change: an orientation
 * flip moves the width by tens of percent, so a 20% threshold clears it while
 * ignoring any residual sub-pixel jitter — without it, a stray wobble resets
 * the baseline to the keyboard-open height and the toolbar vanishes until the
 * keyboard is reopened.
 */
function isVirtualKeyboardOpen(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const vp = window.visualViewport;
  const scale = vp?.scale ?? 1;
  const layoutHeight = (vp?.height ?? window.innerHeight) * scale;
  const layoutWidth = document.documentElement.clientWidth;

  if (Math.abs(layoutWidth - baselineLayoutWidth) > baselineLayoutWidth * 0.2) {
    baselineLayoutWidth = layoutWidth;
    maxLayoutViewportHeight = 0;
  }

  maxLayoutViewportHeight = Math.max(maxLayoutViewportHeight, layoutHeight);
  return maxLayoutViewportHeight - layoutHeight > 150;
}

/**
 * Tracks the visual viewport, publishing the rectangle + pinch-zoom scale as CSS
 * custom properties on the root (`--bn-vv-top/left/width/height/scale`) so the
 * mobile toolbar (and the app's scroll container) can position themselves off
 * the viewport without a React re-render, and returning whether the on-screen
 * keyboard is open.
 *
 * Since it only returns a boolean, the consumer re-renders when the keyboard
 * opens/closes, not on every viewport change (zoom/pan/scroll) — those keep the
 * CSS properties up to date without a re-render.
 *
 * For the smoother "pinned scroll container" layout, the host app opts in by
 * adding the `bn-scroll-container` class to the element wrapping its page
 * content — the matching styles (and the document scroll lock) live in
 * `editor/styles.css`, keyed off that class and the `--bn-vv-*` variables this
 * hook publishes.
 */
export function useVirtualKeyboard(): boolean {
  const [open, setOpen] = useState(isVirtualKeyboardOpen);

  useLayoutEffect(() => {
    const html = document.documentElement;

    const vp = window.visualViewport;
    const update = () => {
      setOpen(isVirtualKeyboardOpen());
      html.style.setProperty("--bn-vv-top", `${vp?.offsetTop ?? 0}px`);
      html.style.setProperty("--bn-vv-left", `${vp?.offsetLeft ?? 0}px`);
      html.style.setProperty(
        "--bn-vv-width",
        `${vp?.width ?? window.innerWidth}px`,
      );
      html.style.setProperty(
        "--bn-vv-height",
        `${vp?.height ?? window.innerHeight}px`,
      );
      html.style.setProperty("--bn-vv-scale", `${vp?.scale ?? 1}`);
    };
    update();

    // Fire on keyboard open/close, zoom/pan, and (unless the document is locked
    // via CSS) content scroll.
    vp?.addEventListener("resize", update);
    vp?.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      vp?.removeEventListener("resize", update);
      vp?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return open;
}
