import {
  VersioningExtension,
  VersionSnapshot,
} from "@blocknote/core/extensions";

import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { dateToString } from "./dateToString.js";
import { useState } from "react";

export const Snapshot = ({ snapshot }: { snapshot: VersionSnapshot }) => {
  const {
    canRestoreSnapshot,
    restoreSnapshot,
    canUpdateSnapshotName,
    updateSnapshotName,
    selectSnapshot,
  } = useExtension(VersioningExtension);
  const selected = useExtensionState(VersioningExtension, {
    selector: (state) => state.selectedSnapshotId === snapshot.id,
  });
  const revertedSnapshot = useExtensionState(VersioningExtension, {
    selector: (state) =>
      snapshot?.meta.restoredFromSnapshotId !== undefined
        ? state.snapshots.find(
            (snap) => snap.id === snapshot.meta.restoredFromSnapshotId,
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
      onClick={() => selectSnapshot(snapshot.id)}
    >
      <div className="bn-snapshot-body">
        <input
          className="bn-snapshot-name"
          type="text"
          readOnly={!canUpdateSnapshotName}
          value={snapshotName}
          onChange={(e) => setSnapshotName(e.target.value)}
          onBlur={() => updateSnapshotName?.(snapshot.id, snapshotName)}
        />
        {snapshot.name && snapshot.name !== dateString && (
          <div className="bn-snapshot-date">{dateString}</div>
        )}
        {revertedSnapshot && (
          <div className="bn-snapshot-original-date">{`Restored from ${dateToString(new Date(revertedSnapshot.createdAt))}`}</div>
        )}
        {/* TODO: Fetch user name */}
        {snapshot.meta.userIds !== undefined &&
          snapshot.meta.userIds.length > 0 && (
            <div className="bn-snapshot-user">{`Edited by ${snapshot.meta.userIds.join(", ")}`}</div>
          )}
      </div>
      {canRestoreSnapshot && (
        <button
          className="bn-snapshot-button"
          onClick={(event) => {
            // Prevent event bubbling to avoid calling `selectSnapshot`.
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
