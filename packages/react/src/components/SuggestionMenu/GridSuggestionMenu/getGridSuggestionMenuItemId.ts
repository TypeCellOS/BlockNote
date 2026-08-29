/**
 * The DOM id of a grid suggestion menu item (emoji picker). Grid items live
 * under their own prefix, so `aria-activedescendant` must be built from this
 * rather than the (flat) suggestion menu's `getSuggestionMenuItemId` — the
 * two id spaces don't overlap, and a mismatch leaves the attribute pointing
 * at no element at all.
 */
export function getGridSuggestionMenuItemId(selectedIndex: number): string;
export function getGridSuggestionMenuItemId(
  selectedIndex: number | undefined,
): string | undefined;
export function getGridSuggestionMenuItemId(selectedIndex: number | undefined) {
  return selectedIndex !== undefined
    ? "bn-grid-suggestion-menu-item-" + selectedIndex
    : undefined;
}
