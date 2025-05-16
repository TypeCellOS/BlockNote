import { BlockNoteEditor } from "@blocknote/core";
import { User } from "@blocknote/core/comments";
import { useCallback, useMemo, useSyncExternalStore } from "react";

export function useUser(
  editor: BlockNoteEditor<any, any, any>,
  userId: string,
) {
  return useUsers(editor, [userId]).get(userId);
}

/**
 * Bridges the UserStore to React using useSyncExternalStore.
 */
export function useUsers(
  editor: BlockNoteEditor<any, any, any>,
  userIds: string[],
) {
  const comments = editor.comments;
  if (!comments) {
    throw new Error("Comments plugin not found");
  }

  const store = comments.userStore;

  const getUpdatedSnapshot = useCallback(() => {
    const map = new Map<string, User>();
    for (const id of userIds) {
      const user = store.getUser(id);
      if (user) {
        map.set(id, user);
      }
    }
    return map;
  }, [store, userIds]);

  // this ref / memoworks around this error:
  // https://react.dev/reference/react/useSyncExternalStore#im-getting-an-error-the-result-of-getsnapshot-should-be-cached
  // however, might not be a good practice to work around it this way

  // We need to use a memo instead of a ref to make sure the snapshot is updated when the userIds change
  const ref = useMemo(() => {
    return {
      current: getUpdatedSnapshot(),
    };
  }, [getUpdatedSnapshot]);

  // note: this is inefficient as it will trigger a re-render even if other users (not in userIds) are updated
  const subscribe = useCallback(
    (cb: () => void) => {
      const ret = store.subscribe((_users) => {
        // update ref when changed
        ref.current = getUpdatedSnapshot();

        // calling cb() will make sure `useSyncExternalStore` will fetch the latest snapshot (which is ref.current)
        cb();
      });
      store.loadUsers(userIds);
      return ret;
    },
    [store, getUpdatedSnapshot, userIds, ref],
  );

  return useSyncExternalStore(subscribe, () => ref.current!);
}
