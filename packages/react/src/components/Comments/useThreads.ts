import { Comments } from "@blocknote/core";
import { ThreadData } from "@blocknote/core/comments";
import { useCallback, useRef, useSyncExternalStore } from "react";

import { usePlugin } from "../../hooks/usePlugin.js";

/**
 * Bridges the ThreadStore to React using useSyncExternalStore.
 */
export function useThreads() {
  const comments = usePlugin(Comments);

  const store = comments.threadStore;

  // this ref works around this error:
  // https://react.dev/reference/react/useSyncExternalStore#im-getting-an-error-the-result-of-getsnapshot-should-be-cached
  // however, might not be a good practice to work around it this way
  const threadsRef = useRef<Map<string, ThreadData> | undefined>(undefined);

  if (!threadsRef.current) {
    threadsRef.current = store.getThreads();
  }

  const subscribe = useCallback(
    (cb: () => void) => {
      return store.subscribe((threads) => {
        // update ref when changed
        threadsRef.current = threads;
        cb();
      });
    },
    [store],
  );

  return useSyncExternalStore(subscribe, () => threadsRef.current!);
}
