import { VersioningExtension } from "@blocknote/core/extensions";
import { useState } from "react";

import { useExtension, useExtensionState } from "../../hooks/useExtension.js";

export const CurrentSnapshot = () => {
  const { createSnapshot, canCreateSnapshot, exitPreview } =
    useExtension(VersioningExtension);
  const selected = useExtensionState(VersioningExtension, {
    selector: (state) => state.previewedSnapshotId === undefined,
  });

  const [snapshotName, setSnapshotName] = useState("Current Version");

  // When the backend doesn't support creating snapshots (e.g. YHub, which
  // records a continuous activity timeline rather than discrete user-saved
  // snapshots), render a plain, non-editable row that simply selects the live
  // document. There's no name input or "Save" button to imply otherwise.
  if (!canCreateSnapshot) {
    return (
      <div
        className={`bn-snapshot ${selected ? "selected" : ""}`}
        onClick={() => exitPreview()}
      >
        <div className="bn-snapshot-body">
          <div className="bn-snapshot-name">Current Version</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bn-snapshot ${selected ? "selected" : ""}`}
      onClick={() => exitPreview()}
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
          // Prevent event bubbling to avoid calling `exitPreview`.
          event.preventDefault();
          event.stopPropagation();

          void createSnapshot?.({
            name: snapshotName !== "Current Version" ? snapshotName : undefined,
          });
          setSnapshotName("Current Version");
        }}
      >
        Save
      </button>
    </div>
  );
};
