/* eslint-disable react/refs -- Track the last completed query without triggering extra renders. */
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

  const usedQuery = useRef<string | undefined>(undefined);

  useEffect(() => {
    let active = true;

    // eslint-disable-next-line react/set-state-in-effect -- Expose the loading transition as soon as a new request starts.
    setLoading(true);

    void getItems(query).then((items) => {
      if (!active) {
        // Ignore obsolete requests, even when their query matches again.
        return;
      }

      setItems(items);
      setLoading(false);
      usedQuery.current = query;
    });

    return () => {
      active = false;
    };
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
