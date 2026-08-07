import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import "./style.css";
import { useEffect, useState } from "react";
import { StaticText, NavBar } from "./DummyUI";
import { createPortal } from "react-dom";

// Enough content that the editor actually overflows, so scrolling is testable.
const initialContent = [
  { type: "paragraph" as const, content: "Welcome to this demo!" },
  {
    type: "paragraph" as const,
    content:
      "Select some text to bring up the keyboard, then scroll — the bar stays " +
      "pinned above the keyboard because the document itself doesn't scroll.",
  },
  ...Array.from({ length: 20 }, (_, i) => ({
    type: "paragraph" as const,
    content:
      `Filler paragraph ${i + 1}. Select some text here and bring up the ` +
      "keyboard to see the bar sit above it.",
  })),
];

type VisualViewportRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  scale: number;
};

function readVisualViewport(): VisualViewportRect {
  const vp = visualViewport;
  return {
    top: vp?.offsetTop ?? 0,
    left: vp?.offsetLeft ?? 0,
    width: vp?.width ?? window.innerWidth,
    height: vp?.height ?? window.innerHeight,
    scale: vp?.scale ?? 1,
  };
}

/**
 * Owns everything about the visual viewport:
 *
 *  - Locks the document so it never scrolls — a `.scroll-host` element does (see
 *    the CSS). With a non-scrolling document, content scrolling is an element
 *    scroll that never moves the visual viewport, so anything pinned to it stays
 *    put during scroll with no per-frame work.
 *  - Tracks the viewport rectangle + pinch-zoom scale and publishes it two ways:
 *    as the returned object (for JS, e.g. keyboard detection) and as CSS custom
 *    properties on the root (`--app-top/left/width/height/scale`) so elements can
 *    position themselves off the viewport without a React re-render.
 */
function useVisualViewport(): VisualViewportRect {
  const [rect, setRect] = useState(readVisualViewport);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // Original values only saved to be able to restore when the parent component unmounts.
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;

    // Disables scrolling on `document` & `document.body`.
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    // TODO: Manually test if necessary.
    // html.style.overscrollBehavior = "none";

    const vp = visualViewport;
    const update = () => {
      const next = readVisualViewport();

      setRect(next);

      html.style.setProperty("--app-top", `${next.top}px`);
      html.style.setProperty("--app-left", `${next.left}px`);
      html.style.setProperty("--app-width", `${next.width}px`);
      html.style.setProperty("--app-height", `${next.height}px`);
      html.style.setProperty("--app-scale", `${next.scale}`);
    };
    update();

    // These fire on keyboard open/close and zoom/pan — never on (element) content scroll, since
    // the document itself can't scroll.
    vp?.addEventListener("resize", update);
    vp?.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;

      html.style.removeProperty("--app-top");
      html.style.removeProperty("--app-left");
      html.style.removeProperty("--app-width");
      html.style.removeProperty("--app-height");
      html.style.removeProperty("--app-scale");

      vp?.removeEventListener("resize", update);
      vp?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return rect;
}

let maxLayoutViewportHeight = 0;
function isVirtualKeyboardOpen(viewport: VisualViewportRect): boolean {
  const layoutHeight = viewport.height * viewport.scale;
  maxLayoutViewportHeight = Math.max(maxLayoutViewportHeight, layoutHeight);
  return maxLayoutViewportHeight - layoutHeight > 150;
}

function VirtualKeyboardToolbar() {
  return createPortal(
    <div className="viewport-bar">Virtual Keyboard Toolbar</div>,
    document.body,
  );
}

export default function App() {
  const editor = useCreateBlockNote({ initialContent });

  const viewport = useVisualViewport();

  return (
    <div className="scroll-host">
      <NavBar />
      <main className="app-main">
        <StaticText />
        <BlockNoteView editor={editor} formattingToolbar={false}>
          {isVirtualKeyboardOpen(viewport) && <VirtualKeyboardToolbar />}
        </BlockNoteView>
        <StaticText />
      </main>
    </div>
  );
}
