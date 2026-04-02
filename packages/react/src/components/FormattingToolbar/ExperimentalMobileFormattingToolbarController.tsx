import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { FormattingToolbarExtension } from "@blocknote/core/extensions";
import { FC, useRef, useEffect } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useExtensionState } from "../../hooks/useExtension.js";
import { FormattingToolbar } from "./FormattingToolbar.js";
import { FormattingToolbarProps } from "./FormattingToolbarProps.js";

const TOOLBAR_HEIGHT = 44;

/**
 * Flicker-free mobile formatting toolbar controller.
 *
 * Uses a CSS custom property (`--bn-mobile-keyboard-offset`) instead of React
 * state to position the toolbar above the virtual keyboard.  This avoids the
 * re-render storm that caused visible flickering in the previous implementation.
 *
 * Two-tier keyboard detection:
 *  1. **VirtualKeyboard API** (Chrome / Edge 94+, Samsung Internet) — provides
 *     exact keyboard geometry before the animation starts.
 *  2. **Visual Viewport API fallback** (Safari iOS 13+, Firefox Android 68+) —
 *     computes keyboard height from the difference between layout and visual
 *     viewport, with focus-based prediction for instant initial positioning.
 */
export const ExperimentalMobileFormattingToolbarController = (props: {
  formattingToolbar?: FC<FormattingToolbarProps>;
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const show = useExtensionState(FormattingToolbarExtension, {
    editor,
  });

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;

    const setOffset = (px: number) => {
      el.style.setProperty(
        "--bn-mobile-keyboard-offset",
        px > 0 ? `${px}px` : "0px",
      );
    };

    let scrollTimer: ReturnType<typeof setTimeout>;

    const scrollSelectionIntoView = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      const vp = window.visualViewport;
      if (!vp) return;
      const visibleBottom = vp.offsetTop + vp.height - TOOLBAR_HEIGHT;
      if (rect.bottom > visibleBottom) {
        window.scrollBy({
          top: rect.bottom - visibleBottom + 16,
          behavior: "smooth",
        });
      } else if (rect.top < vp.offsetTop) {
        window.scrollBy({
          top: rect.top - vp.offsetTop - 16,
          behavior: "smooth",
        });
      }
    };

    // Tier 1: VirtualKeyboard API (Chrome/Edge 94+) — exact geometry, no delay
    const vk = (navigator as any).virtualKeyboard;
    if (vk) {
      vk.overlaysContent = true;
      const onGeometryChange = () => {
        setOffset(vk.boundingRect.height);
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(scrollSelectionIntoView, 100);
      };
      vk.addEventListener("geometrychange", onGeometryChange);
      const onSelectionChange = () => scrollSelectionIntoView();
      document.addEventListener("selectionchange", onSelectionChange);
      return () => {
        vk.removeEventListener("geometrychange", onGeometryChange);
        document.removeEventListener("selectionchange", onSelectionChange);
        clearTimeout(scrollTimer);
      };
    }

    // Tier 2: Visual Viewport API fallback (Safari iOS, Firefox Android)
    const vp = window.visualViewport;
    if (!vp) return;

    let lastKnownKeyboardHeight = 0;

    const update = () => {
      const layoutHeight = document.documentElement.clientHeight;
      const keyboardHeight = layoutHeight - vp.height - vp.offsetTop;
      if (keyboardHeight > 50) lastKnownKeyboardHeight = keyboardHeight;
      setOffset(keyboardHeight);
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(scrollSelectionIntoView, 100);
    };

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA"
      ) {
        if (lastKnownKeyboardHeight > 0) {
          setOffset(lastKnownKeyboardHeight);
        }
      }
    };

    const onFocusOut = () => {
      setOffset(0);
    };

    const onSelectionChange = () => scrollSelectionIntoView();

    vp.addEventListener("resize", update);
    vp.addEventListener("scroll", update);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      vp.removeEventListener("resize", update);
      vp.removeEventListener("scroll", update);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("selectionchange", onSelectionChange);
      clearTimeout(scrollTimer);
    };
  }, []);

  if (!show && divRef.current) {
    return (
      <div
        ref={divRef}
        className="bn-mobile-formatting-toolbar"
        dangerouslySetInnerHTML={{ __html: divRef.current.innerHTML }}
      />
    );
  }

  const Component = props.formattingToolbar || FormattingToolbar;

  return (
    <div ref={divRef} className="bn-mobile-formatting-toolbar">
      <Component />
    </div>
  );
};
