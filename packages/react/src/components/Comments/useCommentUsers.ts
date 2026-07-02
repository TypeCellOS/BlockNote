import { User } from "@blocknote/core";
import { CommentsExtension } from "@blocknote/core/comments";
import { useStore } from "@tanstack/react-store";
import { useEffect } from "react";

import { useExtension } from "../../hooks/useExtension.js";

/**
 * Reads users from the comments extension's user store, loading any that aren't
 * cached yet. Re-renders only when one of the requested users changes (the store
 * uses a shallow `Map` comparison).
 *
 * Comments-scoped: it reads the store the {@link CommentsExtension} builds from
 * `resolveUsers` and exposes on its instance, so it must be used within a comment
 * UI where that extension is registered.
 */
export function useCommentUsers<U extends User = User>(
  userIds: string[],
): Map<string, U> {
  const { userStore } = useExtension(CommentsExtension);

  // `userIds` is often a fresh array each render, so key the effect on its
  // contents rather than its identity to avoid re-loading on every render.
  const userIdsKey = userIds.join(",");

  useEffect(() => {
    void userStore.loadUsers(userIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStore, userIdsKey]);

  return useStore(userStore.store, (state) => {
    const users = new Map<string, U>();
    for (const id of userIds) {
      const user = state.get(id) as U | undefined;
      if (user) {
        users.set(id, user);
      }
    }
    return users;
  });
}

export function useCommentUser<U extends User = User>(
  userId: string,
): U | undefined {
  return useCommentUsers<U>([userId]).get(userId);
}
