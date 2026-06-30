import { User, UserExtension } from "@blocknote/core";
import { useEffect } from "react";

import { useExtension, useExtensionState } from "./useExtension.js";

export function useUser<U extends User = User>(userId: string): U | undefined {
  return useUsers<U>([userId]).get(userId);
}

/**
 * Reads users from the {@link UserExtension} store, loading any that aren't
 * cached yet. Re-renders only when one of the requested users changes
 * (the store uses a shallow `Map` comparison).
 *
 * Generic over the user type `U`, so additional properties returned by
 * `resolveUsers` are reported back.
 */
export function useUsers<U extends User = User>(
  userIds: string[],
): Map<string, U> {
  const userExtension = useExtension(UserExtension);

  // `userIds` is often a fresh array each render, so key the effect on its
  // contents rather than its identity to avoid re-loading on every render.
  const userIdsKey = userIds.join(",");

  useEffect(() => {
    void userExtension.loadUsers(userIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userExtension, userIdsKey]);

  return useExtensionState(UserExtension, {
    selector: (state) => {
      const users = new Map<string, U>();
      for (const id of userIds) {
        const user = state.get(id) as U | undefined;
        if (user) {
          users.set(id, user);
        }
      }
      return users;
    },
  });
}
