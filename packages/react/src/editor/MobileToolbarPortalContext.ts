import { createContext, useContext } from "react";

/**
 * The DOM node the mobile formatting toolbar's dropdowns should portal into, or
 * `null` when not in the mobile toolbar (e.g. on desktop). This doubles as the
 * "is this the mobile toolbar?" signal for toolbar buttons: it's non-null only
 * while they're rendered inside the mobile toolbar.
 *
 * `MobileFormattingToolbarController` renders the toolbar into a themed
 * container mounted on `document.body` (so it escapes the editor's scroll
 * container, whose overflow would otherwise clip the dropdowns and whose iOS
 * stacking context would trap the toolbar), and provides that container here.
 * The dropdowns portal into it rather than bare `document.body` so they land
 * inside its theme classes/variables and stay styled — Mantine and the other
 * adapters append popovers as direct children of the portal target, so
 * targeting `document.body` would drop them outside the theme scope. A set
 * `portalRoot` also tells the UI adapters not to move focus into the dropdown,
 * which would blur the editor and dismiss the on-screen keyboard.
 */
export const MobileToolbarPortalContext = createContext<HTMLElement | null>(
  null,
);

export function useMobileToolbarPortal(): HTMLElement | null {
  return useContext(MobileToolbarPortalContext);
}
