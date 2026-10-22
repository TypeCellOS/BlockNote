import { User } from "@blocknote/core";
import type { VersionSnapshot } from "@blocknote/core/extensions";
import { useEffect } from "react";

import { useVersioning } from "./useVersioning.js";
import { useStore } from "../../hooks/useStore.js";

/** Reads complete author records, retaining raw IDs until they resolve. */
export function useSnapshotUsers(
  snapshot: VersionSnapshot | undefined,
): (User | string)[] | undefined {
  const byIds =
    snapshot?.by === undefined
      ? []
      : Array.isArray(snapshot.by)
        ? snapshot.by
        : [snapshot.by];
  const { userStore } = useVersioning();

  // `byIds` is often a fresh array each render, so key the effect on its
  // contents rather than its identity to avoid re-loading on every render.
  const byIdsKey = byIds.join(",");

  useEffect(() => {
    void userStore.loadUsers(byIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStore, byIdsKey]);

  return useStore(userStore.store, (users) =>
    byIds.length === 0 ? undefined : byIds.map((id) => users.get(id) ?? id),
  );
}
