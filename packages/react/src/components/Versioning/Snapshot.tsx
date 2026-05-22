import {
  VersioningExtension,
  VersionSnapshot,
} from "@blocknote/core/extensions";

import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { dateToString } from "./dateToString.js";
import { useState } from "react";

export const Snapshot = ({
  snapshot,
  previousSnapshot,
}: {
  snapshot: VersionSnapshot;
  previousSnapshot?: VersionSnapshot;
}) => {
  const {
    canRestoreSnapshot,
    restoreSnapshot,
    canUpdateSnapshotName,
    updateSnapshotName,
    previewSnapshot,
  } = useExtension(VersioningExtension);
  const selected = useExtensionState(VersioningExtension, {
    selector: (state) => state.previewedSnapshotId === snapshot.id,
  });
  const revertedSnapshot = useExtensionState(VersioningExtension, {
    selector: (state) =>
      snapshot?.restoredFromSnapshotId !== undefined
        ? state.snapshots.find(
            (snap) => snap.id === snapshot.restoredFromSnapshotId,
          )
        : undefined,
  });

  const dateString = dateToString(new Date(snapshot?.createdAt || 0));
  const [snapshotName, setSnapshotName] = useState(
    snapshot?.name || dateString,
  );

  if (snapshot === undefined) {
    return null;
  }

  return (
    <div
      className={`bn-snapshot ${selected ? "selected" : ""}`}
      onClick={() =>
        previewSnapshot(snapshot.id, {
          compareTo: previousSnapshot?.id,
        })
      }
    >
      <div className="bn-snapshot-body">
        <input
          className="bn-snapshot-name"
          type="text"
          readOnly={!canUpdateSnapshotName}
          value={snapshotName}
          onChange={(e) => setSnapshotName(e.target.value)}
          onBlur={() =>
            updateSnapshotName?.(
              snapshot.id,
              snapshotName === dateString ? undefined : snapshotName,
            )
          }
        />
        {snapshot.name && snapshot.name !== dateString && (
          <div className="bn-snapshot-date">{dateString}</div>
        )}
        {revertedSnapshot && (
          <div className="bn-snapshot-original-date">{`Restored from ${dateToString(new Date(revertedSnapshot.createdAt))}`}</div>
        )}
        {snapshot.secondaryLabel !== undefined && (
          <div className="bn-snapshot-secondary-label">
            {snapshot.secondaryLabel}
          </div>
        )}
      </div>
      {canRestoreSnapshot && (
        <button
          className="bn-snapshot-button"
          onClick={(event) => {
            // Prevent event bubbling to avoid calling `previewSnapshot`.
            event.preventDefault();
            event.stopPropagation();

            restoreSnapshot?.(snapshot.id);
          }}
        >
          Restore
        </button>
      )}
    </div>
  );
};
