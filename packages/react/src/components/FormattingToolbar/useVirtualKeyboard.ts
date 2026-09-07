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
 * content — the matching styles live in `editor/styles.css`, keyed off that
 * class and the `--bn-vv-*` variables this hook publishes.
 */
const VIEWPORT_PROPERTIES = [
  "--bn-vv-top",
  "--bn-vv-left",
  "--bn-vv-width",
  "--bn-vv-height",
  "--bn-vv-scale",
] as const;

// How many mounted hooks publish the `--bn-vv-*` properties. The last one
// out removes them: left behind, they pin a `bn-scroll-container` to the
// keyboard-open size after the editor is gone (a client-side navigation to a
// page without an editor), and a page-level property is shared by every
// editor on the page, so no single hook may remove it while another still
// needs it.
let viewportPublishers = 0;

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
    viewportPublishers++;
    update();

    // Fire on keyboard open/close, zoom/pan, and content scroll.
    vp?.addEventListener("resize", update);
    vp?.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    // A pinned `bn-scroll-container` contains its overscroll only once it has
    // scrolled (see the rule in `editor/styles.css`): at the top the overscroll
    // must reach the document for the browser's pull-to-refresh to fire.
    // Scroll events don't bubble, so listen in the capture phase.
    const markScrolled = (container: HTMLElement) =>
      container.toggleAttribute("data-bn-scrolled", container.scrollTop > 0);
    const onScroll = (event: Event) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.classList.contains("bn-scroll-container")
      ) {
        markScrolled(event.target);
      }
    };
    document.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
    for (const container of document.querySelectorAll<HTMLElement>(
      ".bn-scroll-container",
    )) {
      markScrolled(container);
    }

    return () => {
      vp?.removeEventListener("resize", update);
      vp?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", onScroll, { capture: true });
      viewportPublishers--;
      if (viewportPublishers === 0) {
        for (const property of VIEWPORT_PROPERTIES) {
          html.style.removeProperty(property);
        }
        // The keyboard baseline goes with them: a later editor starts from
        // what it measures itself, not from a maximum seen on another page.
        maxLayoutViewportHeight = 0;
        baselineLayoutWidth = 0;
      }
    };
  }, []);

  return open;
}
