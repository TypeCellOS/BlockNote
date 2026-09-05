import { useLayoutEffect, useState } from "react";

// The tallest layout-equivalent viewport height seen so far — our stand-in for
// "keyboard closed" — and the layout width it was measured at. Module scope so
// they survive re-renders; the height only ever grows within a given width, so
// refreshing it from a render pass is safe.
let maxLayoutViewportHeight = 0;
let baselineLayoutWidth = 0;

// Set once we've checked the viewport meta tag, so the warning below fires at
// most once per page rather than on every editor mount.
let hasCheckedViewportMeta = false;

/**
 * Warns (once) if the page's viewport meta tag is missing
 * `interactive-widget=resizes-content`. Without it, browsers shrink only the
 * visual viewport when the on-screen keyboard opens, so the mobile Formatting
 * Toolbar (and other `position: fixed` UI) can end up hidden behind the
 * keyboard. See https://www.blocknotejs.org/docs/getting-started#mobile-compatibility
 */
function warnIfViewportMetaMisconfigured() {
  if (hasCheckedViewportMeta || typeof document === "undefined") {
    return;
  }
  hasCheckedViewportMeta = true;

  const content =
    document.querySelector('meta[name="viewport"]')?.getAttribute("content") ??
    "";

  // Strip whitespace so `initial-scale=1, interactive-widget=resizes-content`
  // (and any stray spaces) still match.
  if (
    !content.replace(/\s/g, "").includes("interactive-widget=resizes-content")
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      `[BlockNote] This page's viewport meta tag is missing "interactive-widget=resizes-content" in its content attribute. Add it to ensure proper mobile functionality, e.g. <meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">. See https://www.blocknotejs.org/docs/getting-started#mobile-compatibility for more information`,
    );
  }
}

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
 * content — the matching styles live in `editor/styles.css`, keyed off that
 * class and the `--bn-vv-*` variables this hook publishes.
 */
export function useVirtualKeyboard(): boolean {
  const [open, setOpen] = useState(isVirtualKeyboardOpen);

  useLayoutEffect(() => {
    warnIfViewportMetaMisconfigured();

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

    // Fire on keyboard open/close, zoom/pan, and content scroll.
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
