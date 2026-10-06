import { useCallback, useEffect, useRef, useState } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";

/**
 * PROTOTYPE ONLY: `?mobiletoolbar=1` forces the mobile toolbar on, so the panel
 * can be reviewed in a desktop browser, where there is no virtual keyboard and
 * no touch to detect. Remove before this ships.
 */
export function mobileToolbarForced() {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("mobiletoolbar")
  );
}

/** Used when the keyboard's height can't be measured (it never opened). */
const FALLBACK_PANEL_HEIGHT = 300;

/**
 * Lets a panel take the on-screen keyboard's place, the way Notes and Mail do
 * on iOS: opening it dismisses the keyboard and renders the panel in the space
 * that frees up, so the document above never moves.
 *
 * The editor keeps DOM focus throughout. `inputmode="none"` is what makes that
 * possible: the caret stays visible and taps still move it, but the OS is told
 * not to raise a keyboard for this element. (Technique taken from
 * suitenumerique/messages, MIT, which needed it for the same panel pattern.)
 */
export function useKeyboardPanel<View extends string>() {
  const editor = useBlockNoteEditor();
  // Which panel stands in for the keyboard, if any. One panel per toolbar
  // button, the way Notion's mobile toolbar works: each is focused enough to
  // fit without scrolling, and the row above stays available to switch.
  const [openView, setOpenView] = useState<View | undefined>(undefined);
  const [panelHeight, setPanelHeight] = useState(FALLBACK_PANEL_HEIGHT);
  // The tallest visible viewport seen, which is the keyboard-closed height.
  // What the viewport is missing against it right now is the keyboard.
  const maxVisibleHeight = useRef(0);

  useEffect(() => {
    const vp = window.visualViewport;
    const measure = () => {
      maxVisibleHeight.current = Math.max(
        maxVisibleHeight.current,
        vp?.height ?? window.innerHeight,
      );
    };
    measure();
    vp?.addEventListener("resize", measure);
    return () => vp?.removeEventListener("resize", measure);
  }, []);

  const openPanel = useCallback(
    (view: View) => {
      const visible = window.visualViewport?.height ?? window.innerHeight;
      const keyboardHeight = maxVisibleHeight.current - visible;
      setPanelHeight(
        keyboardHeight > 150 ? keyboardHeight : FALLBACK_PANEL_HEIGHT,
      );
      // Set before the blur: the keyboard must not come back when the user taps
      // into the text while the panel stands in for it.
      editor.domElement?.setAttribute("inputmode", "none");
      // The keyboard only goes down when focus does. The selection lives in
      // editor state, so it survives the blur and the commands still apply.
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setOpenView(view);
    },
    [editor],
  );

  const closePanel = useCallback(() => {
    setOpenView(undefined);
    const dom = editor.domElement;
    // Order matters: the attribute has to go first, and a still-focused editor
    // has to be blurred, because focusing an already focused element is a
    // no-op that would leave the keyboard down.
    dom?.removeAttribute("inputmode");
    if (
      dom &&
      document.activeElement instanceof HTMLElement &&
      dom.contains(document.activeElement)
    ) {
      document.activeElement.blur();
    }
    editor.focus();
  }, [editor]);

  // The attribute belongs to the panel: never leave it behind on unmount.
  useEffect(
    () => () => editor.domElement?.removeAttribute("inputmode"),
    [editor],
  );

  return {
    openView,
    panelOpen: openView !== undefined,
    panelHeight,
    openPanel,
    closePanel,
  };
}
