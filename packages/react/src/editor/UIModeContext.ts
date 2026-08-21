import { createContext, useContext } from "react";

/**
 * Describes the kind of UI surface the editor's floating elements
 * (menus, popovers, dropdowns in `ComponentsContext`) are rendered into.
 *
 * `"desktop"` is the default. `"mobile"` is provided by
 * `MobileFormattingToolbarController` and signals that the surrounding surface
 * is pinned above the on-screen keyboard, so consumers portal their dropdowns
 * into `editor.portalElement` (escaping the toolbar's horizontal scroll clip)
 * by passing it as the `portalRoot` prop of `ComponentsContext` dropdowns.
 */
export type UIMode = "desktop" | "mobile";

export const UIModeContext = createContext<UIMode>("desktop");

export function useUIMode(): UIMode {
  return useContext(UIModeContext);
}
