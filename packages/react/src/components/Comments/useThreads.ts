import { CommentsExtension } from "@blocknote/core/comments";
import { ThreadStore } from "@blocknote/core/comments";
import { useMemo, useSyncExternalStore } from "react";

import { useExtension } from "../../hooks/useExtension.js";

function createThreadSnapshot(store: ThreadStore) {
  let threads = store.getThreads();
  function getSnapshot() {
    return threads;
  }
  function subscribe(onStoreChange: () => void) {
    const unsubscribe = store.subscribe((nextThreads) => {
      threads = nextThreads;
      onStoreChange();
    });
    // Catch changes between rendering and subscribing.
    threads = store.getThreads();
    onStoreChange();
    return unsubscribe;
  }
  return { getSnapshot, subscribe };
}

/**
 * Bridges the ThreadStore to React using useSyncExternalStore.
 */
export function useThreads() {
  const comments = useExtension(CommentsExtension);

  const store = comments.threadStore;

  // getThreads may allocate a fresh Map. Cache snapshots until the store
  // notifies, with a separate cache for each ThreadStore.
  const snapshot = useMemo(() => createThreadSnapshot(store), [store]);

  return useSyncExternalStore(snapshot.subscribe, snapshot.getSnapshot);
}
