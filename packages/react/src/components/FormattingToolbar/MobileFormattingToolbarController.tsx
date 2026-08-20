import { FC, useEffect, useState } from "react";

import { PortalContext } from "../../editor/PortalContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { FormattingToolbarProps } from "./FormattingToolbarProps.js";
import { FormattingToolbar } from "./FormattingToolbar.js";
import { useVirtualKeyboard } from "./useVirtualKeyboard.js";

/**
 * Mobile formatting toolbar controller.
 *
 * Pins the formatting toolbar to the bottom of the visual viewport — just above
 * the on-screen keyboard — positioning itself purely from the `--bn-vv-*` CSS
 * variables published by {@link useVirtualKeyboard} (see
 * `.bn-mobile-formatting-toolbar` in the styles), so it needs no re-render to
 * follow the viewport.
 *
 * By default it does not lock document scroll. For the smoother
 * "non-scrolling document" behavior (the toolbar staying pinned during scroll
 * with no per-frame work), the host app opts in via CSS: locking document
 * scroll (`overflow: hidden` on `html`/`body`) and sizing its scroll container
 * to the visual viewport via the same `--bn-vv-*` variables.
 *
 * The toolbar itself scrolls horizontally (`overflow-x: auto`), which clips any
 * inline dropdown on mobile. So the outer `.bn-mobile-formatting-toolbar`
 * wrapper — outside that scroll container — is published via
 * {@link PortalContext}, which the generic UI adapters read to portal their
 * menus/popovers into it automatically.
 *
 * Shown while the virtual keyboard is open and this editor holds focus. The
 * focus check is essential when multiple editors share a page: the virtual
 * keyboard is a single, page-wide signal, so without it every editor's
 * controller would show its toolbar whenever any editor (or any other input)
 * opened the keyboard. Touch toolbar buttons `preventDefault` on pointer down
 * to keep the editor focused, so tapping them doesn't dismiss the toolbar.
 */
export const MobileFormattingToolbarController = (props: {
  formattingToolbar?: FC<FormattingToolbarProps>;
}) => {
  const editor = useBlockNoteEditor();
  const keyboardOpen = useVirtualKeyboard();

  // Whether this editor holds focus, kept in sync via its `focus`/`blur`
  // events so the toolbar shows/hides as focus enters or leaves the editor.
  const [focused, setFocused] = useState(() => editor.isFocused());
  useEffect(() => {
    // Re-sync on mount in case focus changed before the listeners attached.
    setFocused(editor.isFocused());

    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);

    editor._tiptapEditor.on("focus", onFocus);
    editor._tiptapEditor.on("blur", onBlur);

    return () => {
      editor._tiptapEditor.off("focus", onFocus);
      editor._tiptapEditor.off("blur", onBlur);
    };
  }, [editor]);

  // The non-scrolling wrapper, published so buttons can portal their dropdowns
  // out of the horizontally scrolling toolbar. A callback ref into state so the
  // context updates once the element mounts.
  const [toolbarElement, setToolbarElement] = useState<HTMLDivElement | null>(
    null,
  );

  if (!keyboardOpen || !focused) {
    return null;
  }

  const Component = props.formattingToolbar || FormattingToolbar;

  return (
    <PortalContext.Provider value={toolbarElement}>
      <div className="bn-mobile-formatting-toolbar" ref={setToolbarElement}>
        <Component />
      </div>
    </PortalContext.Provider>
  );
};
