import { useEffect, useRef, useState } from "react";

// Hook which loads the items for a suggestion menu and returns them along with
// information whether the current query is still being processed, and the
// query that was used to retrieve the last set of items.
export function useLoadSuggestionMenuItems<T>(
  query: string,
  getItems: (query: string) => Promise<T[]>,
): {
  items: T[];
  usedQuery: string | undefined;
  loadingState: "loading-initial" | "loading" | "loaded";
} {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  const currentQuery = useRef<string | undefined>(undefined);
  const usedQuery = useRef<string | undefined>(undefined);

  useEffect(() => {
    const thisQuery = query;
    currentQuery.current = query;

    setLoading(true);

    getItems(query).then((items) => {
      if (currentQuery.current !== thisQuery) {
        // outdated query returned, ignore the result
        return;
      }

      setItems(items);
      setLoading(false);
      usedQuery.current = thisQuery;
    });
  }, [query, getItems]);

  return {
    items: items || [],
    // The query that was used to retrieve the last set of items may not be the
    // same as the current query as the items from the current query may not
    // have been retrieved yet. This is useful when using the returns of this
    // hook in other hooks.
    usedQuery: usedQuery.current,
    loadingState:
      usedQuery.current === undefined
        ? "loading-initial"
        : loading
          ? "loading"
          : "loaded",
  };
}
