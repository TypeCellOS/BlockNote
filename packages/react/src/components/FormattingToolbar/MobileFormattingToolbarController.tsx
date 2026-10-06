import { FC } from "react";
import { createPortal } from "react-dom";
import { RiArrowDownSLine, RiListUnordered, RiText } from "react-icons/ri";

import {
  PortalElementAnchor,
  PortalElementOverride,
  usePortalElement,
} from "../../editor/PortalElementOverride.js";
import { UIModeContext } from "../../editor/UIModeContext.js";
import { useEditorFocus } from "../../hooks/useEditorFocus.js";
import { FormattingToolbarProps } from "./FormattingToolbarProps.js";
import { MobileBlockPanel, MobileFormatPanel } from "./MobileFormatPanel.js";
import { FormattingToolbar } from "./FormattingToolbar.js";
import { mobileToolbarForced, useKeyboardPanel } from "./useKeyboardPanel.js";
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
  panel: ReturnType<typeof useKeyboardPanel<"format" | "blocks">>;
}) => {
  const keyboardOpen = useVirtualKeyboard();

  // Whether the user is still interacting with this editor: content focus or
  // focus within its UI (a toolbar popover's input, portalled into
  // a registered portal element, must not hide the toolbar — unmounting it would
  // take the popover down with it).
  const focused = useEditorFocus({ includeEditorUI: true });
  const panel = props.panel;

  // The panel dismisses the keyboard to take its place, so neither the
  // keyboard nor content focus can gate the toolbar while it is open.
  if (
    !mobileToolbarForced() &&
    !panel.panelOpen &&
    (!keyboardOpen || !focused)
  ) {
    return null;
  }

  return (
    <PortalElementOverride target={document.body}>
      <UIModeContext.Provider value="mobile">
        <MobileFormattingToolbar
          formattingToolbar={props.formattingToolbar || FormattingToolbar}
          panel={panel}
        />
      </UIModeContext.Provider>
    </PortalElementOverride>
  );
};

function MobileFormattingToolbar(props: {
  formattingToolbar: FC<FormattingToolbarProps>;
  panel: ReturnType<typeof useKeyboardPanel<"format" | "blocks">>;
}) {
  const portalElement = usePortalElement();
  const Component = props.formattingToolbar;
  const { openView, panelHeight, openPanel, closePanel } = props.panel;
  const panelOpen = openView !== undefined;

  // One button per panel, each toggling its own: the row stays available so
  // switching between them is a single tap, as on Notion's mobile toolbar.
  const triggers = [
    { view: "format" as const, icon: <RiText />, label: "Format" },
    { view: "blocks" as const, icon: <RiListUnordered />, label: "Block type" },
  ];

  if (!portalElement) {
    return null;
  }

  // The anchor is rendered next to the toolbar, not inside it: the toolbar
  // scrolls horizontally, and iOS WebKit clips positioned descendants of a
  // scroll container, so its dropdowns must not be descendants of it.
  return createPortal(
    <PortalElementAnchor>
      <div
        className="bn-mobile-formatting-toolbar"
        data-panel-open={panelOpen ? "" : undefined}
      >
        <div className="bn-mobile-toolbar-row">
          {triggers.map((trigger) => (
            <button
              key={trigger.view}
              type="button"
              className="bn-mobile-toolbar-action"
              aria-label={trigger.label}
              aria-expanded={openView === trigger.view}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() =>
                openView === trigger.view
                  ? closePanel()
                  : openPanel(trigger.view)
              }
            >
              {trigger.icon}
            </button>
          ))}
          {!panelOpen && <Component />}
          {/* Our own dismiss control: iOS's own is in the keyboard's accessory
              bar, which a web page can neither restyle nor reach. */}
          <button
            type="button"
            className="bn-mobile-toolbar-action"
            aria-label="Hide keyboard"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editorBlur()}
          >
            <RiArrowDownSLine />
          </button>
        </div>
        {panelOpen && (
          <div
            className="bn-mobile-toolbar-panel"
            style={{ height: panelHeight }}
          >
            {openView === "format" ? (
              <MobileFormatPanel onClose={closePanel} />
            ) : (
              <MobileBlockPanel onClose={closePanel} />
            )}
          </div>
        )}
      </div>
    </PortalElementAnchor>,
    portalElement,
  );
}

/** Drops focus so the OS takes the keyboard down. */
function editorBlur() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}
