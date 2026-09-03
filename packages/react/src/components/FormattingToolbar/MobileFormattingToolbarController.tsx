import { FC, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { PortalTarget, usePortalContext } from "../../editor/PortalTarget.js";
import { UIModeContext } from "../../editor/UIModeContext.js";
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
 * The toolbar is portaled into a container mounted on `document.body` rather
 * than rendered inline in the editor container. The editor commonly lives inside
 * a scrolling/pinned container (e.g. the `bn-scroll-container` layout), and on
 * iOS that container's `-webkit-overflow-scrolling` stacking context paints the
 * `position: fixed` toolbar behind page content like footers; rendering at the
 * body level avoids that. It provides a `"mobile"` {@link UIModeContext} so its
 * buttons know to portal their dropdowns (into the body-level portal target,
 * escaping the editor container's overflow) and to suppress moving focus into
 * them, which would blur the editor and dismiss the keyboard. React context
 * (editor, components, theme provider) still flows through the portal.
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

  // Whether focus is within this editor's UI, kept in sync via its
  // `focus`/`blur` events so the toolbar shows/hides as focus enters or leaves
  // the editor.
  const [focused, setFocused] = useState(() => editor.isFocused());
  useEffect(() => {
    // Re-sync on mount in case focus changed before the listeners attached.
    setFocused(editor.isFocused());

    const onFocus = () => setFocused(true);
    // When the editor's content blurs, focus may still be within the editor's
    // own floating UI — e.g. a toolbar popover's input autofocusing, which
    // portals into `document.body`. Treating that as "focus left the editor"
    // would unmount this toolbar (and the popover with it), so it would appear
    // to never open. `relatedTarget` is unreliable on mobile, so we re-check
    // `document.activeElement` on the next frame and only hide once focus has
    // truly left the editor and its portal.
    const onBlur = () => {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        setFocused(
          editor.isFocused() || (!!active && editor.isWithinEditor(active)),
        );
      });
    };

    editor._tiptapEditor.on("focus", onFocus);
    editor._tiptapEditor.on("blur", onBlur);

    return () => {
      editor._tiptapEditor.off("focus", onFocus);
      editor._tiptapEditor.off("blur", onBlur);
    };
  }, [editor]);

  if (!keyboardOpen || !focused) {
    return null;
  }

  return (
    <PortalTarget target={document.body}>
      <UIModeContext.Provider value="mobile">
        <MobileFormattingToolbar
          formattingToolbar={props.formattingToolbar || FormattingToolbar}
        />
      </UIModeContext.Provider>
    </PortalTarget>
  );
};

function MobileFormattingToolbar(props: {
  formattingToolbar: FC<FormattingToolbarProps>;
}) {
  const root = usePortalContext();
  const Component = props.formattingToolbar;

  if (!root) {
    return null;
  }

  return createPortal(
    <div className="bn-mobile-formatting-toolbar">
      <Component />
    </div>,
    root,
  );
}
