import { BlockNoteEditor, User } from "@blocknote/core";
import { useCallback, useRef, useSyncExternalStore } from "react";

export function useUser(
  editor: BlockNoteEditor<any, any, any>,
  userId: string
) {
  return useUsers(editor, [userId]).get(userId);
}

export function useUsers(
  editor: BlockNoteEditor<any, any, any>,
  userIds: string[]
) {
  const comments = editor.comments;
  if (!comments) {
    throw new Error("Comments plugin not found");
  }

  const store = comments.userStore;

  // this ref works around this error:
  // https://react.dev/reference/react/useSyncExternalStore#im-getting-an-error-the-result-of-getsnapshot-should-be-cached
  // however, might not be a good practice to work around it this way
  const usersRef = useRef<Map<string, User>>();

  const getSnapshot = useCallback(() => {
    const map = new Map<string, User>();
    for (const id of userIds) {
      const user = store.getUser(id);
      if (user) {
        map.set(id, user);
      }
    }
    return map;
  }, [store, userIds]);

  if (!usersRef.current) {
    usersRef.current = getSnapshot();
  }

  // note: this is inefficient as it will trigger a re-render even if other users (not in userIds) are updated
  const subscribe = useCallback(
    (cb: () => void) => {
      const ret = store.subscribe((_users) => {
        // update ref when changed
        usersRef.current = getSnapshot();
        cb();
      });
      store.loadUsers(userIds);
      return ret;
    },
    [store, getSnapshot, userIds]
  );

  return useSyncExternalStore(subscribe, () => usersRef.current!);
}
