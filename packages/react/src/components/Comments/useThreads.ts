import { BlockNoteEditor } from "@blocknote/core";
import { ThreadData } from "@blocknote/core/comments";
import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * Bridges the ThreadStore to React using useSyncExternalStore.
 */
export function useThreads(editor: BlockNoteEditor<any, any, any>) {
  const comments = editor.comments;
  if (!comments) {
    throw new Error("Comments plugin not found");
  }

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
