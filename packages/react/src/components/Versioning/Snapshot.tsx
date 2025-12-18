import {
  VersioningExtension,
  VersionSnapshot,
} from "@blocknote/core/extensions";

import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { dateToString } from "./dateToString.js";

export const Snapshot = ({ snapshot }: { snapshot: VersionSnapshot }) => {
  const { restoreSnapshot, updateSnapshotName, selectSnapshot } =
    useExtension(VersioningExtension);
  const selected = useExtensionState(VersioningExtension, {
    selector: (state) => state.selectedSnapshotId === snapshot.id,
  });
  const revertedSnapshot = useExtensionState(VersioningExtension, {
    selector: (state) =>
      snapshot?.revertedSnapshotId !== undefined
        ? state.snapshots.find(
            (snap) => snap.id === snapshot.revertedSnapshotId,
          )
        : undefined,
  });

  const dateString = dateToString(new Date(snapshot?.createdAt || 0));

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
          defaultValue={snapshot?.name || dateString}
          onBlur={(event) => {
            updateSnapshotName?.(snapshot.id, event.target.value);
          }}
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
      <button
        className="bn-snapshot-button"
        onClick={() => restoreSnapshot?.(snapshot.id)}
      >
        Restore
      </button>
    </div>
  );
};
