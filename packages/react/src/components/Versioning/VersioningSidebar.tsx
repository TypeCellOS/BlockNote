import { VersioningExtension } from "@blocknote/core/extensions";

import { useExtensionState } from "../../hooks/useExtension.js";
import { CurrentSnapshot } from "./CurrentSnapshot.js";
import { Snapshot } from "./Snapshot.js";

export const VersioningSidebar = (props: { filter?: "named" | "all" }) => {
  const { snapshots } = useExtensionState(VersioningExtension);

  return (
    <div className="bn-versioning-sidebar">
      <CurrentSnapshot />
      {snapshots
        .filter((snapshot) =>
          props.filter === "named" ? snapshot.name !== undefined : true,
        )
        .map((snapshot, i, arr) => {
          return (
            <Snapshot
              key={snapshot.id}
              snapshot={snapshot}
              previousSnapshot={arr[i + 1]}
            />
          );
        })}
    </div>
  );
};
