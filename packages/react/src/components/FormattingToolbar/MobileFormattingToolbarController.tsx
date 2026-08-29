import { FC, useEffect, useState } from "react";

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
 * Works with both page layouts described in the docs. In the default
 * "scrolling document" layout the toolbar follows the visual viewport as the
 * page scrolls. For the smoother "scroll container" layout (the toolbar
 * staying pinned during scroll with no per-frame work), the host app opts in
 * via CSS: locking document scroll (`overflow: hidden` on `html`/`body`) and
 * pinning its scroll container to the visual viewport via the same `--bn-vv-*`
 * variables.
 *
 * The toolbar itself scrolls horizontally (`overflow-x: auto`), which clips any
 * inline dropdown on mobile. So this publishes {@link UIModeContext} as
 * `"mobile"`, which the toolbar's dropdown buttons read (via `useUIMode`) to
 * pass `editor.portalElement` as the `portalRoot` of their
 * menus/popovers/selects — rendering them outside the scroll container. A set
 * `portalRoot` also tells the UI adapters not to move focus into the dropdown,
 * which would blur the editor and dismiss the keyboard.
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

  // Whether the user is still interacting with this editor: content focus or
  // focus within its floating UI (a toolbar popover's input, portalled into
  // `editor.portalElement`, must not hide the toolbar — unmounting it would
  // take the popover down with it). `includeFloatingUI` events are settled and
  // deduplicated, and the state below only ever holds those settled values —
  // reading the focus state live during a render could observe the transient
  // `<body>` focus of a mid-handoff frame.
  const [focused, setFocused] = useState(() =>
    editor.isFocused({ includeFloatingUI: true }),
  );
  useEffect(() => {
    // Re-sync in case focus changed before the subscription attached.
    setFocused(editor.isFocused({ includeFloatingUI: true }));
    return editor.onFocusChange((_editor, ctx) => setFocused(ctx.focused), {
      includeFloatingUI: true,
    });
  }, [editor]);

  if (!keyboardOpen || !focused) {
    return null;
  }

  const Component = props.formattingToolbar || FormattingToolbar;

  return (
    <UIModeContext.Provider value="mobile">
      <div className="bn-mobile-formatting-toolbar">
        <Component />
      </div>
    </UIModeContext.Provider>
  );
};
