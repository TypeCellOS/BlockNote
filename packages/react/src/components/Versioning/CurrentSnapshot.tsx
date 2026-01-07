import { VersioningExtension } from "@blocknote/core/extensions";
import { useState } from "react";

import { useExtension, useExtensionState } from "../../hooks/useExtension.js";

export const CurrentSnapshot = () => {
  const { createSnapshot, selectSnapshot } = useExtension(VersioningExtension);
  const selected = useExtensionState(VersioningExtension, {
    selector: (state) => state.selectedSnapshotId === undefined,
  });

  const [snapshotName, setSnapshotName] = useState("Current Version");

  return (
    <div
      className={`bn-snapshot ${selected ? "selected" : ""}`}
      onClick={() => selectSnapshot(undefined)}
    >
      <div className="bn-snapshot-body">
        <input
          className="bn-snapshot-name"
          type="text"
          value={snapshotName}
          onChange={(event) => setSnapshotName(event.target.value)}
        />
        {snapshotName !== "Current Version" && (
          <div className="bn-snapshot-date">Current Version</div>
        )}
      </div>
      <button
        className="bn-snapshot-button"
        onClick={(event) => {
          // Prevent event bubbling to avoid calling `selectSnapshot`.
          event.preventDefault();
          event.stopPropagation();

          createSnapshot(
            snapshotName !== "Current Version" ? snapshotName : undefined,
          );
          setSnapshotName("Current Version");
        }}
      >
        Save
      </button>
    </div>
  );
};
