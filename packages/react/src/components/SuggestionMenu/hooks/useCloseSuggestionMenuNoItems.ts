import { useEffect, useRef } from "react";

// Hook which closes the suggestion after a certain number of consecutive
// invalid queries are made. An invalid query is one which returns no items, and
// each invalid query must be longer than the previous one to close the menu
export function useCloseSuggestionMenuNoItems<Item>(
  items: Item[],
  usedQuery: string | undefined,
  closeMenu: () => void,
  invalidQueries = 3,
  isComposing = false,
) {
  const lastUsefulQueryLength = useRef(0);
  const composingQuery = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (usedQuery === undefined) {
      return;
    }

    if (isComposing) {
      composingQuery.current = usedQuery;
      return;
    }

    if (composingQuery.current === usedQuery) {
      return;
    }

    composingQuery.current = undefined;

    if (items.length > 0) {
      lastUsefulQueryLength.current = usedQuery.length;
    } else if (
      usedQuery.length - lastUsefulQueryLength.current >
      invalidQueries
    ) {
      closeMenu();
    }
  }, [closeMenu, invalidQueries, isComposing, items.length, usedQuery]);
}
