import { createContext, useContext } from "react";

/**
 * Describes the kind of UI surface the editor's floating elements (menus,
 * popovers, dropdowns from `ComponentsContext`) are being rendered into.
 *
 * `"desktop"` is the default. `"mobile"` is provided by
 * `MobileFormattingToolbarController`, whose toolbar is pinned above the
 * on-screen keyboard and lives outside the editor's DOM subtree. Toolbar
 * buttons read this to decide whether to portal their dropdowns (into the
 * ambient portal target) and to suppress moving focus into them — which on
 * desktop would break keyboard nav, and on mobile would blur the editor's
 * contentEditable and dismiss the keyboard.
 */
export type UIMode = "desktop" | "mobile";

export const UIModeContext = createContext<UIMode>("desktop");

export function useUIMode(): UIMode {
  return useContext(UIModeContext);
}
