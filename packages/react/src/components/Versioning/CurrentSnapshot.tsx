import {
  CURRENT_VERSION_ID,
  VersioningExtension,
  VersionSnapshot,
} from "@blocknote/core/extensions";
import { RiArrowLeftRightLine, RiMoreFill } from "react-icons/ri";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { dateToString } from "./dateToString.js";
import { useVersioningSidebar } from "./VersioningSidebarContext.js";

/**
 * The "current version" list row. Unlike {@link Snapshot}, it isn't backed by a
 * stored snapshot: clicking it previews the live document (read-only, diffed
 * against the most recent snapshot) or returns to live editing. It is rendered
 * only when the backend's `list()` emits an entry with {@link CURRENT_VERSION_ID}
 * (e.g. YHub when the live doc has edits beyond the latest saved version).
 *
 * The `snapshot` prop carries display metadata (last-edit timestamp + author)
 * but is never sent to `getContent`/`getAttributions` — those go through
 * `previewCurrentVersion`, which serialises the live document directly.
 */
export const CurrentSnapshot = ({
  snapshot,
  previousSnapshot,
}: {
  snapshot: VersionSnapshot;
  previousSnapshot?: VersionSnapshot;
}) => {
  const Components = useComponentsContext()!;
  const { canPreviewCurrentVersion, previewCurrentVersion, exitPreview } =
    useExtension(VersioningExtension);
  const selected = useExtensionState(VersioningExtension, {
    selector: (state) => state.previewedSnapshotId === CURRENT_VERSION_ID,
  });
  // Exclude the current-version entry itself — it lives in the list too, but
  // it's not something to diff against.
  const snapshots = useExtensionState(VersioningExtension, {
    selector: (state) =>
      state.snapshots.filter((s) => s.id !== CURRENT_VERSION_ID),
  });

  const { comparisonEnabled, comparisonMode, setComparisonMode } =
    useVersioningSidebar();

  // Clicking the current version shows a read-only diff of the live document
  // against the most recent snapshot. When comparison mode is off, or there's
  // nothing to diff against, return to the live editing view instead.
  const handleSelect = () => {
    if (comparisonMode && previewCurrentVersion && previousSnapshot) {
      void previewCurrentVersion({ compareTo: previousSnapshot.id });
    } else {
      exitPreview();
    }
  };

  // "Compare since beginning" diffs the live document against the oldest
  // snapshot. Shown only when current-version diffing is supported and there's
  // at least one snapshot to compare against.
  const oldestSnapshot = snapshots[snapshots.length - 1];
  const actions =
    comparisonEnabled &&
    canPreviewCurrentVersion &&
    previewCurrentVersion &&
    oldestSnapshot ? (
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
              onClick={() => {
                setComparisonMode(true);
                void previewCurrentVersion({ compareTo: oldestSnapshot.id });
              }}
            >
              Compare since beginning
            </Components.Generic.Menu.Item>
          </Components.Generic.Menu.Dropdown>
        </Components.Generic.Menu.Root>
      </Components.Generic.Toolbar.Root>
    ) : undefined;

  return (
    <Components.Versioning.Snapshot
      className="bn-snapshot"
      selected={selected}
      onClick={handleSelect}
      actions={actions}
    >
      <div className="bn-snapshot-body">
        <div className="bn-snapshot-name">Current version</div>
        {/* The timestamp + author of the last edit are only shown when the
            backend stamps them (e.g. YHub). Backends that don't track them
            (e.g. in-memory) just get the "Current version" label. */}
        {snapshot.secondaryLabel !== undefined && (
          <div className="bn-snapshot-date">
            {dateToString(new Date(snapshot.createdAt))}
          </div>
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
