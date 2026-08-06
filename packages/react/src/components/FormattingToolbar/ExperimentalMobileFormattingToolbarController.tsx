import { isSafari } from "@blocknote/core";
import { FC, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { FormattingToolbarProps } from "./FormattingToolbarProps.js";
import { MobileFormattingToolbar } from "./MobileFormattingToolbar.js";

type VisualViewportRect = {
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
 * Owns the viewport setup the mobile toolbar relies on:
 *
 *  - Locks the document so it never scrolls. The host app is expected to put its
 *    scrollable content in an element sized to the visual viewport (via the
 *    `--bn-vv-*` variables below). With a non-scrolling document, content
 *    scrolling is an element scroll that never moves the visual viewport, so the
 *    toolbar stays pinned above the keyboard during scroll with no per-frame
 *    work — and, on iOS, so browser chrome doesn't shift things mid-scroll.
 *  - Tracks the viewport rectangle + pinch-zoom scale, publishing it as CSS
 *    custom properties on the root (`--bn-vv-top/left/width/height/scale`) so the
 *    toolbar (and the app's scroll container) position themselves off the
 *    viewport without a React re-render, and as the returned object for JS.
 */
function useVisualViewport(): VisualViewportRect {
  const [rect, setRect] = useState(readVisualViewport);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // Saved only so they can be restored when the controller unmounts.
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

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

    // These fire on keyboard open/close and zoom/pan — never on (element)
    // content scroll, since the document itself can't scroll.
    vp?.addEventListener("resize", update);
    vp?.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
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
function isVirtualKeyboardOpen(viewport: VisualViewportRect): boolean {
  const layoutHeight = viewport.height * viewport.scale;
  maxLayoutViewportHeight = Math.max(maxLayoutViewportHeight, layoutHeight);
  return maxLayoutViewportHeight - layoutHeight > 150;
}

/**
 * Experimental mobile formatting toolbar controller.
 *
 * Pins the formatting toolbar to the bottom of the visual viewport — just above
 * the on-screen keyboard — using the "non-scrolling document" approach (see
 * {@link useVisualViewport}): the document is locked so the visual viewport
 * never moves during content scroll, and the toolbar positions itself purely
 * from the `--bn-vv-*` CSS variables (see `.bn-mobile-formatting-toolbar` in the
 * styles). So it stays put during scroll with no per-frame work, and needs no
 * re-render to follow the viewport.
 *
 * The host app must place its scrollable content in an element sized to the
 * visual viewport via those same variables (an element scroll, since the
 * document itself can no longer scroll).
 *
 * Shown while the virtual keyboard is open.
 */
export const ExperimentalMobileFormattingToolbarController = (props: {
  formattingToolbar?: FC<FormattingToolbarProps>;
}) => {
  const editor = useBlockNoteEditor();
  const viewport = useVisualViewport();

  // The toolbar is `position: fixed` (pinned to the visual viewport), but a
  // scroll container clips fixed descendants on mobile — and `.bn-container`
  // (which BlockNoteView renders) is often the scroll container. So we portal
  // the toolbar onto `<body>`, out of the editor. That also escapes the editor's
  // theme root, so we mirror its theme classes onto our body-level container to
  // keep the toolbar's colors.
  const [container] = useState(() => document.createElement("div"));

  useEffect(() => {
    document.body.appendChild(container);
    return () => container.remove();
  }, [container]);

  // Keep the container's theme in sync with the editor's themed portal element.
  // No dependency array: this also runs after BlockNoteView's own theming effect
  // (which runs after this child's effects on first mount) and on re-renders.
  useEffect(() => {
    const themeRoot = editor.portalElement;
    container.className = themeRoot.className;
    for (const attr of ["data-color-scheme", "data-mantine-color-scheme"]) {
      const value = themeRoot.getAttribute(attr);
      if (value !== null) {
        container.setAttribute(attr, value);
      }
    }
  });

  if (!isVirtualKeyboardOpen(viewport)) {
    return null;
  }

  const Component = props.formattingToolbar || MobileFormattingToolbar;

  return createPortal(
    <div
      className="bn-mobile-formatting-toolbar"
      // Tapping a control must not dismiss the keyboard, which happens when the
      // editor's contentEditable loses focus. On non-Safari browsers the default
      // `mousedown` action focuses the tapped button, so we prevent it. On
      // Safari/iOS we must NOT preventDefault: the default doesn't focus the
      // button there anyway, and preventing it cancels the tap's synthesized
      // `click`, so nothing would open. (iOS keeps editor focus on its own since
      // the controls' explicit Safari focus is skipped on touch — see
      // ToolbarButton/ToolbarSelect.)
      onMouseDown={(e) => {
        if (!isSafari()) {
          e.preventDefault();
        }
      }}
    >
      {/* Inner element owns the horizontal scroll. The outer toolbar must NOT
          clip, or upward-opening dropdowns (rendered above it) get cut off. The
          dropdowns escape this scroller because their containing block is the
          positioned outer toolbar, not this element. */}
      <div className="bn-mobile-formatting-toolbar-scroll">
        <Component />
      </div>
    </div>,
    container,
  );
};
