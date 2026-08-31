import { FC, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { MobileToolbarPortalContext } from "../../editor/MobileToolbarPortalContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { FormattingToolbarProps } from "./FormattingToolbarProps.js";
import { FormattingToolbar } from "./FormattingToolbar.js";
import { useVirtualKeyboard } from "./useVirtualKeyboard.js";

// Theme-carrying attributes copied from `editor.portalElement` onto the mobile
// toolbar's body-level container: the classes (`bn-root`, the UI-library class
// like `bn-mantine`, the color-scheme class) that existing CSS keys off, the
// color-scheme data attributes, and any inline theme CSS variables (set for
// custom object themes).
const THEME_ATTRIBUTES = [
  "class",
  "style",
  "data-color-scheme",
  "data-mantine-color-scheme",
];

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
 * body level avoids that. Its dropdown buttons portal their menus into the same
 * container (via {@link MobileToolbarPortalContext}) so they escape the editor
 * container's overflow instead of being clipped. A set `portalRoot` also tells
 * the UI adapters not to move focus into the dropdown, which would blur the
 * editor and dismiss the keyboard.
 *
 * Because the container lives outside the editor's themed subtree, it mirrors
 * the theme attributes from `editor.portalElement` ({@link THEME_ATTRIBUTES}) so
 * the toolbar and dropdowns stay styled. React context (editor, components,
 * theme provider) still flows through the portal, so only the DOM-inherited
 * styling needs recreating.
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
    <MobileFormattingToolbar
      formattingToolbar={props.formattingToolbar || FormattingToolbar}
    />
  );
};

/**
 * The visible part of the mobile toolbar, split out so it can own the state for
 * its themed body-level container. See the controller docstring.
 */
function MobileFormattingToolbar(props: {
  formattingToolbar: FC<FormattingToolbarProps>;
}) {
  const editor = useBlockNoteEditor();

  // The themed container the toolbar and its dropdowns render into. Tracked in
  // state so it can be provided to the dropdown buttons once mounted.
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        // Mirror the editor portal's theme attributes so the container matches
        // the editor's `.bn-root`/UI-library theming despite living outside its
        // subtree. Recreating the styling in the DOM, not React context (which
        // the portal preserves).
        const portal = editor.portalElement;
        for (const name of THEME_ATTRIBUTES) {
          const value = portal.getAttribute(name);
          if (value !== null) {
            node.setAttribute(name, value);
          }
        }
      }
      setContainer(node);
    },
    [editor],
  );

  const Component = props.formattingToolbar;

  return createPortal(
    <MobileToolbarPortalContext.Provider value={container}>
      <div ref={containerRef}>
        <div className="bn-mobile-formatting-toolbar">
          <Component />
        </div>
      </div>
    </MobileToolbarPortalContext.Provider>,
    document.body,
  );
}
