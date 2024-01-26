import { useEffect, useRef } from "react";

export function useCloseSuggestionMenuNoItems<T>(
  items: T[],
  usedQuery: string | undefined,
  closeMenu: () => void,
  invalidQueries = 3
) {
  const lastUsefulQueryLength = useRef(0);

  useEffect(() => {
    if (usedQuery === undefined) {
      return;
    }

    if (items.length > 0) {
      lastUsefulQueryLength.current = usedQuery.length;
    } else if (
      usedQuery.length - lastUsefulQueryLength.current >
      invalidQueries
    ) {
      closeMenu();
    }
  }, [closeMenu, invalidQueries, items.length, usedQuery]);
}
