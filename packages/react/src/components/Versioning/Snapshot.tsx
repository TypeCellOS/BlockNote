import {
  CURRENT_VERSION_ID,
  VersioningExtension,
  VersionSnapshot,
} from "@blocknote/core/extensions";
import { useState } from "react";
import {
  RiArrowGoBackFill,
  RiArrowLeftRightLine,
  RiMoreFill,
} from "react-icons/ri";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { dateToString } from "./dateToString.js";
import { useVersioningSidebar } from "./VersioningSidebarContext.js";

export const Snapshot = ({
  snapshot,
  previousSnapshot,
}: {
  snapshot: VersionSnapshot;
  previousSnapshot?: VersionSnapshot;
}) => {
  const Components = useComponentsContext()!;
  const {
    canRestoreSnapshot,
    restoreSnapshot,
    canUpdateSnapshotName,
    updateSnapshotName,
    previewSnapshot,
    previewCurrentVersion,
  } = useExtension(VersioningExtension);
  const selected = useExtensionState(VersioningExtension, {
    selector: (state) => state.previewedSnapshotId === snapshot.id,
  });
  const previewedSnapshotId = useExtensionState(VersioningExtension, {
    selector: (state) => state.previewedSnapshotId,
  });
  const compareToSnapshotId = useExtensionState(VersioningExtension, {
    selector: (state) => state.compareToSnapshotId,
  });
  const revertedSnapshot = useExtensionState(VersioningExtension, {
    selector: (state) =>
      snapshot?.restoredFromSnapshotId !== undefined
        ? state.snapshots.find(
            (snap) => snap.id === snapshot.restoredFromSnapshotId,
          )
        : undefined,
  });

  const { comparisonMode, setComparisonMode } = useVersioningSidebar();

  const dateString = dateToString(new Date(snapshot?.createdAt || 0));
  const [snapshotName, setSnapshotName] = useState(
    snapshot?.name || dateString,
  );

  if (snapshot === undefined) {
    return null;
  }

  // The "Comparing to" badge tracks the actual diff baseline (the store's
  // `compareToSnapshotId`), so it always shows which version is being compared
  // against. It's hidden on the row currently being viewed (a version is never
  // diffed against itself).
  const isBaseline = compareToSnapshotId === snapshot.id && !selected;

  // Clicking a version previews it. In comparison mode it's diffed against its
  // chronological predecessor — i.e. the baseline always resets to the previous
  // version. Otherwise the version is shown on its own with no diff.
  const handleSelect = () => {
    if (!comparisonMode) {
      void previewSnapshot(snapshot.id);
      return;
    }
    void previewSnapshot(snapshot.id, { compareTo: previousSnapshot?.id });
  };

  // "Compare with this version" moves the diff baseline to this version,
  // keeping whatever is currently being viewed (the live document when nothing
  // — or this same version — was being viewed).
  const handleCompareWith = () => {
    setComparisonMode(true);

    const viewingOtherSnapshot =
      previewedSnapshotId !== undefined &&
      previewedSnapshotId !== CURRENT_VERSION_ID &&
      previewedSnapshotId !== snapshot.id;
    if (viewingOtherSnapshot) {
      void previewSnapshot(previewedSnapshotId, { compareTo: snapshot.id });
    } else if (previewCurrentVersion) {
      void previewCurrentVersion({ compareTo: snapshot.id });
    }
  };

  const actions = (
    <Components.Generic.Toolbar.Root
      variant="action-toolbar"
      className="bn-action-toolbar"
    >
      <Components.Generic.Menu.Root position="bottom-start">
        <Components.Generic.Menu.Trigger>
          <Components.Generic.Toolbar.Button
            className="bn-snapshot-menu-trigger"
            mainTooltip="More"
            variant="compact"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <RiMoreFill size={16} />
          </Components.Generic.Toolbar.Button>
        </Components.Generic.Menu.Trigger>
        <Components.Generic.Menu.Dropdown className="bn-menu-dropdown">
          <Components.Generic.Menu.Item
            icon={<RiArrowLeftRightLine />}
            onClick={handleCompareWith}
          >
            Compare with this version
          </Components.Generic.Menu.Item>
          {canRestoreSnapshot && (
            <Components.Generic.Menu.Item
              icon={<RiArrowGoBackFill />}
              onClick={() => {
                void restoreSnapshot?.(snapshot.id);
              }}
            >
              Restore
            </Components.Generic.Menu.Item>
          )}
        </Components.Generic.Menu.Dropdown>
      </Components.Generic.Menu.Root>
    </Components.Generic.Toolbar.Root>
  );

  return (
    <Components.Versioning.Snapshot
      className="bn-snapshot"
      selected={selected}
      comparing={isBaseline}
      onClick={handleSelect}
      actions={actions}
    >
      {isBaseline && (
        <div className="bn-snapshot-comparing-to">
          <RiArrowLeftRightLine size={14} />
          <span>Comparing to</span>
        </div>
      )}
      <div className="bn-snapshot-body">
        {canUpdateSnapshotName ? (
          <input
            className="bn-snapshot-name"
            type="text"
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={() =>
              updateSnapshotName?.(
                snapshot.id,
                snapshotName === dateString ? undefined : snapshotName,
              )
            }
          />
        ) : (
          <div className="bn-snapshot-name">{snapshotName}</div>
        )}
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
    </Components.Versioning.Snapshot>
  );
};
