import { BlockNoteEditor, ThreadData } from "@blocknote/core";
import { useCallback, useRef, useSyncExternalStore } from "react";

export function useThreadStore(editor: BlockNoteEditor<any, any, any>) {
  const store = editor.comments!.store;

  // this ref works around this error:
  // https://react.dev/reference/react/useSyncExternalStore#im-getting-an-error-the-result-of-getsnapshot-should-be-cached
  // however, might not be a good practice to work around it this way
  const threadsRef = useRef<Map<string, ThreadData>>();

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
    [store]
  );

  return useSyncExternalStore(subscribe, () => threadsRef.current!);
}
