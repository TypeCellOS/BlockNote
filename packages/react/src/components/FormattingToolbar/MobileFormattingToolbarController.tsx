import { FC, Ref, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  PortalElementOverride,
  usePortalElement,
} from "../../editor/PortalElementOverride.js";
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

  // Whether this editor's toolbar should be the one on screen. Presentation
  // policy on top of the focus state: when the settled focus sits inside a
  // *nested* BlockNote editor (the comment composer is a full BlockNoteView
  // living inside this editor's floating UI), that editor mounts its own
  // mobile toolbar, so this one yields — otherwise both would pin to the same
  // spot at the bottom of the viewport. The innermost `bn-container` around
  // the focused element identifies which editor the user is typing in; focus
  // in this editor's own popovers (portalled into its container) still counts
  // as ours, and UI portalled to a bare external node (no `bn-container`)
  // never causes a yield.
  const isFocusOwn = () => {
    const active = document.activeElement;
    const container = active?.closest(".bn-container") ?? null;
    const own = editor.prosemirrorView?.dom.closest(".bn-container") ?? null;
    return container === null || container === own;
  };

  // Whether the user is still interacting with this editor: content focus or
  // focus within its UI (a toolbar popover's input, portalled into a
  // registered portal element, must not hide the toolbar — unmounting it would
  // take the popover down with it). `includeEditorUI` events are settled,
  // and the state below only ever holds those settled values — reading the
  // focus state live during a render could observe the transient `<body>`
  // focus of a mid-handoff frame. They also fire when focus moves *between*
  // parts of the UI, so the yield check above is re-evaluated on each move.
  const [focused, setFocused] = useState(
    () => editor.isFocused({ includeEditorUI: true }) && isFocusOwn(),
  );
  useEffect(() => {
    // Re-sync in case focus changed before the subscription attached.
    setFocused(editor.isFocused({ includeEditorUI: true }) && isFocusOwn());
    return editor.onFocusChange(
      (_editor, ctx) => setFocused(ctx.focused && isFocusOwn()),
      { includeEditorUI: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const visible = keyboardOpen && focused;

  // While the toolbar overlays the bottom of the viewport, reserve that space
  // in the editor's scroll behavior: `setScrollInsets` keeps the caret
  // scrolling clear of the toolbar, and the `bn-mobile-toolbar-open` class
  // (see styles.css) adds matching bottom padding so the document has the
  // scroll room for its last lines to clear it. Nested editors (the comment
  // composer is a BlockNoteView floating above the keyboard) are skipped —
  // they don't manage the page's scroll space.
  const toolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = editor.domElement?.closest<HTMLElement>(".bn-container");
    const toolbar = toolbarRef.current;
    if (
      !visible ||
      !toolbar ||
      !container ||
      container.parentElement?.closest(".bn-container")
    ) {
      return;
    }
    const height = toolbar.getBoundingClientRect().height;
    container.style.setProperty("--bn-mobile-toolbar-height", `${height}px`);
    container.classList.add("bn-mobile-toolbar-open");
    editor.setScrollInsets({ bottom: height + 8 });
    // The keyboard may have opened with the caret already behind the toolbar.
    if (editor.isFocused()) {
      const view = editor.prosemirrorView;
      view?.dispatch(view.state.tr.scrollIntoView());
    }
    return () => {
      container.classList.remove("bn-mobile-toolbar-open");
      container.style.removeProperty("--bn-mobile-toolbar-height");
      editor.setScrollInsets(undefined);
    };
  }, [editor, visible]);

  if (!visible) {
    return null;
  }

  return (
    <PortalElementOverride target={document.body}>
      <UIModeContext.Provider value="mobile">
        <MobileFormattingToolbar
          formattingToolbar={props.formattingToolbar || FormattingToolbar}
          toolbarRef={toolbarRef}
        />
      </UIModeContext.Provider>
    </PortalElementOverride>
  );
};

function MobileFormattingToolbar(props: {
  formattingToolbar: FC<FormattingToolbarProps>;
  toolbarRef: Ref<HTMLDivElement>;
}) {
  const portalElement = usePortalElement();
  const Component = props.formattingToolbar;

  if (!portalElement) {
    return null;
  }

  return createPortal(
    <div className="bn-mobile-formatting-toolbar" ref={props.toolbarRef}>
      <Component />
    </div>,
    portalElement,
  );
}
