import { useLayoutEffect, useState } from "react";

// The tallest layout-equivalent viewport height seen so far — our stand-in for
// "keyboard closed". Module scope so it survives re-renders; it only ever grows,
// so refreshing it from a render pass is safe.
let maxLayoutViewportHeight = 0;

/**
 * Whether the on-screen keyboard is open, from the current visual viewport. We
 * compare `height * scale` — the zoom-invariant layout-equivalent height, so
 * pinch-zoom (which also shrinks `height`) doesn't count — against the tallest
 * value seen, treating a drop of more than 150px as open: comfortably above
 * URL-bar show/hide (~60-100px) and below any real keyboard (~250px+).
 */
function isVirtualKeyboardOpen(): boolean {
  const vp = window.visualViewport;
  const layoutHeight = (vp?.height ?? window.innerHeight) * (vp?.scale ?? 1);
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
 * Does not lock document scroll. For the smoother "non-scrolling document"
 * behavior, the host app opts in with CSS (see
 * {@link MobileFormattingToolbarController}). This is what that controller
 * relies on for positioning and keyboard detection.
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
      html.style.removeProperty("--bn-vv-top");
      html.style.removeProperty("--bn-vv-left");
      html.style.removeProperty("--bn-vv-width");
      html.style.removeProperty("--bn-vv-height");
      html.style.removeProperty("--bn-vv-scale");
      vp?.removeEventListener("resize", update);
      vp?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return open;
}
