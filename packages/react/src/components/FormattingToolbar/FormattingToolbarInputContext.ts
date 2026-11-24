import { createContext } from "react";

/** Supplies external viewport input to a toolbar subtree. Without a provider,
 * the toolbar detects touch and tracks the browser's visual viewport itself.
 * A provider owns viewport positioning, including the `--bn-vv-*` styles.
 */
export const FormattingToolbarInputContext = createContext<
  { isTouchDevice: boolean; keyboardOpen: boolean } | undefined
>(undefined);
