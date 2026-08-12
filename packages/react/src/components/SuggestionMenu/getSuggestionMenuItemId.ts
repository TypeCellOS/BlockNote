export function getSuggestionMenuItemId(selectedIndex: number | undefined) {
  return selectedIndex !== undefined
    ? "bn-suggestion-menu-item-" + selectedIndex
    : undefined;
}
