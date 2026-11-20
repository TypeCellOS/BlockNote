import { User } from "@blocknote/core";
import type { VersionSnapshot } from "@blocknote/core/extensions";
import { useEffect, useMemo } from "react";

import { useVersioning } from "./useVersioning.js";
import { useStore } from "../../hooks/useStore.js";

/** Reads complete author records, retaining raw IDs until they resolve. */
export function useSnapshotUsers(
  snapshot: VersionSnapshot | undefined,
): (User | string)[] | undefined {
  const by = snapshot?.by;
  const byIds = useMemo(
    () => (by === undefined ? [] : Array.isArray(by) ? by : [by]),
    [by],
  );
  const { userStore } = useVersioning();

  useEffect(() => {
    // The store already caches users and deduplicates in-flight requests.
    void userStore.loadUsers(byIds);
  }, [userStore, byIds]);

  return useStore(userStore.store, (users) =>
    byIds.length === 0 ? undefined : byIds.map((id) => users.get(id) ?? id),
  );
}
