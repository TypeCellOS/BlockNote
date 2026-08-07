import { useEffect, useState } from "react";

export type VisualViewportRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  scale: number;
};

function readVisualViewport(): VisualViewportRect {
  const vp = window.visualViewport;
  return {
    top: vp?.offsetTop ?? 0,
    left: vp?.offsetLeft ?? 0,
    width: vp?.width ?? window.innerWidth,
    height: vp?.height ?? window.innerHeight,
    scale: vp?.scale ?? 1,
  };
}

/**
 * Tracks the visual viewport rectangle + pinch-zoom scale, publishing it as CSS
 * custom properties on the root (`--bn-vv-top/left/width/height/scale`) so the
 * mobile toolbar (and the app's scroll container) can position themselves off
 * the viewport without a React re-render, and returning it as an object for JS.
 *
 * Does not lock document scroll — that's the opt-in part, see
 * {@link useVisualViewport}. This is what
 * {@link MobileFormattingToolbarController} relies on for positioning and
 * keyboard detection.
 */
export function useVisualViewportRect(): VisualViewportRect {
  const [rect, setRect] = useState(readVisualViewport);

  useEffect(() => {
    const html = document.documentElement;

    const vp = window.visualViewport;
    const update = () => {
      const next = readVisualViewport();
      setRect(next);
      html.style.setProperty("--bn-vv-top", `${next.top}px`);
      html.style.setProperty("--bn-vv-left", `${next.left}px`);
      html.style.setProperty("--bn-vv-width", `${next.width}px`);
      html.style.setProperty("--bn-vv-height", `${next.height}px`);
      html.style.setProperty("--bn-vv-scale", `${next.scale}`);
    };
    update();

    // Fire on keyboard open/close, zoom/pan, and (unless the document is locked
    // via `useVisualViewport`) content scroll.
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

  return rect;
}

// The tallest layout-equivalent viewport height seen so far — our stand-in for
// "keyboard closed". Module scope so it survives re-renders; it only ever grows,
// so refreshing it from a render pass is safe.
let maxLayoutViewportHeight = 0;

/**
 * Whether the on-screen keyboard is open, from a visual-viewport snapshot. We
 * compare `height * scale` — the zoom-invariant layout-equivalent height, so
 * pinch-zoom (which also shrinks `height`) doesn't count — against the tallest
 * value seen, treating a drop of more than 150px as open: comfortably above
 * URL-bar show/hide (~60-100px) and below any real keyboard (~250px+).
 */
export function isVirtualKeyboardOpen(viewport: VisualViewportRect): boolean {
  const layoutHeight = viewport.height * viewport.scale;
  maxLayoutViewportHeight = Math.max(maxLayoutViewportHeight, layoutHeight);
  return maxLayoutViewportHeight - layoutHeight > 150;
}

/**
 * Opt-in smooth-scrolling setup for the mobile formatting toolbar.
 *
 * On top of tracking the visual viewport (see {@link useVisualViewportRect}), it
 * locks the document so it never scrolls: with a non-scrolling document, content
 * scroll becomes an element scroll that never moves the visual viewport, so the
 * toolbar stays pinned above the keyboard during scroll with no per-frame work
 * (and, on iOS, browser chrome doesn't shift things mid-scroll).
 *
 * The cost is that the document itself can no longer scroll — the host app must
 * put its scrollable content in an element sized to the visual viewport (via the
 * same `--bn-vv-*` variables this publishes). Call this from your app only if
 * you want that behavior; `MobileFormattingToolbarController` works without it,
 * just without the non-scrolling-document smoothness.
 */
export function useVisualViewport(): VisualViewportRect {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // Saved only so they can be restored when the hook unmounts.
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  // Publishing the CSS vars here too is idempotent with the controller's own
  // tracking (same values written to the same properties).
  return useVisualViewportRect();
}
