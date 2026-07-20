import { User } from "@blocknote/core";
import {
  VersioningExtension,
  VersionSnapshot,
} from "@blocknote/core/extensions";
import { useStore } from "@tanstack/react-store";
import { useEffect } from "react";

import { useExtension } from "../../hooks/useExtension.js";

/**
 * Reads users from the versioning extension's user store, loading any that
 * aren't cached yet. Re-renders only when one of the requested users changes
 * (the store uses a shallow `Map` comparison).
 *
 * Versioning-scoped: it reads the store the {@link VersioningExtension} builds
 * from its `resolveUsers` option and exposes on its instance, so it must be
 * used within a versioning UI where that extension is registered.
 */
export function useVersionUsers<U extends User = User>(
  userIds: string[],
): Map<string, U> {
  const { userStore } = useExtension(VersioningExtension);

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

/**
 * Computes the secondary label to display for a snapshot row: the snapshot's
 * explicit `secondaryLabel` when set, otherwise its `by` author ids resolved
 * to usernames (falling back to the raw id for users the store can't
 * resolve). Reactive: re-renders as user info loads into the store.
 */
export function useSnapshotLabel(
  snapshot: VersionSnapshot | undefined,
): string | undefined {
  const byIds =
    snapshot?.by === undefined
      ? []
      : Array.isArray(snapshot.by)
        ? snapshot.by
        : [snapshot.by];
  const users = useVersionUsers(byIds);

  if (snapshot?.secondaryLabel !== undefined) {
    return snapshot.secondaryLabel;
  }
  if (byIds.length === 0) {
    return undefined;
  }
  return byIds.map((id) => users.get(id)?.username ?? id).join(", ");
}
