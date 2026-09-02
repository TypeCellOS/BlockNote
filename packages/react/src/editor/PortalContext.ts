import { createContext, useContext } from "react";

/**
 * The default DOM node that the editor's floating UI (toolbars, menus,
 * popovers, table handles, etc.) portals into — used instead of reaching for
 * `editor.portalElement` directly.
 *
 * Provided at two levels:
 * 1. `BlockNoteView` provides `editor.portalElement` as the default.
 * 2. The mobile formatting toolbar overrides it for its own subtree (its
 *    body-level container) so its dropdowns portal alongside it.
 *
 * Per-element (`portalElements` map) and manual overrides instead flow through
 * the `portalElement` prop on the controllers / popovers, which `GenericPopover`
 * resolves against this context (`portalElement ?? context`) and re-provides to
 * its subtree.
 *
 * `null` means "no portal target available" (e.g. during SSR); consumers that
 * require one should throw.
 */
export const PortalContext = createContext<HTMLElement | null>(null);

export function usePortalContext(): HTMLElement | null {
  return useContext(PortalContext);
}
