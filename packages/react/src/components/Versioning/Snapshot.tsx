import {
  CURRENT_VERSION_ID,
  VersioningExtension,
  VersionSnapshot,
} from "@blocknote/core/extensions";
import { useState } from "react";
import {
  RiArrowGoBackFill,
  RiArrowLeftRightLine,
  RiDeleteBinLine,
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
    canRestore,
    restore,
    canRename,
    rename,
    canRemove,
    remove,
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

  const { comparisonEnabled, comparisonMode, setComparisonMode } =
    useVersioningSidebar();

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

  // The menu only appears when at least one of its items is available:
  // "Compare with this version" (comparison), "Restore", or "Delete". When none
  // apply, there's nothing to show, so drop the menu entirely.
  const actions =
    comparisonEnabled || canRestore || canRemove ? (
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
            {comparisonEnabled && (
              <Components.Generic.Menu.Item
                icon={<RiArrowLeftRightLine />}
                onClick={handleCompareWith}
              >
                Compare with this version
              </Components.Generic.Menu.Item>
            )}
            {canRestore && (
              <Components.Generic.Menu.Item
                icon={<RiArrowGoBackFill />}
                onClick={() => {
                  void restore?.(snapshot.id);
                }}
              >
                Restore
              </Components.Generic.Menu.Item>
            )}
            {canRemove && (
              <Components.Generic.Menu.Item
                icon={<RiDeleteBinLine />}
                onClick={() => {
                  void remove?.(snapshot.id);
                }}
              >
                Delete
              </Components.Generic.Menu.Item>
            )}
          </Components.Generic.Menu.Dropdown>
        </Components.Generic.Menu.Root>
      </Components.Generic.Toolbar.Root>
    ) : undefined;

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
        {canRename ? (
          <input
            className="bn-snapshot-name"
            type="text"
            value={snapshotName}
            // Editing the title is only allowed once this version is the one
            // being viewed. Otherwise the first click just selects the version.
            readOnly={!selected}
            // Signal the interaction: a pointer (button-like) when the click
            // will only select this version, a text caret once it's editable.
            style={{ cursor: selected ? "text" : "pointer" }}
            onChange={(e) => setSnapshotName(e.target.value)}
            onMouseDown={(e) => {
              // When this version isn't selected, keep the input from grabbing
              // focus so the click falls through to the row and only selects
              // the version — a second click (now selected) starts editing.
              if (!selected) {
                e.preventDefault();
              }
            }}
            onClick={(e) => {
              // Only swallow the click once editable; otherwise let it bubble
              // to the row's handler so this version gets selected.
              if (selected) {
                e.stopPropagation();
              }
            }}
            onBlur={() =>
              rename?.(
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
