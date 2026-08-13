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
 * Does not lock document scroll. For the smoother "non-scrolling document"
 * behavior, the host app opts in with CSS (see
 * {@link MobileFormattingToolbarController}). This is what that controller
 * relies on for positioning and keyboard detection.
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
