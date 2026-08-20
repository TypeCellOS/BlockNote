import {
  CURRENT_VERSION_ID,
  VersioningExtension,
  type VersionSnapshot,
} from "@blocknote/core/extensions";
import { useEffect } from "react";
import { RiArrowLeftRightLine, RiCloseLine, RiSaveLine } from "react-icons/ri";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { CurrentSnapshot } from "./CurrentSnapshot.js";
import { Snapshot } from "./Snapshot.js";
import {
  VersioningSidebarProvider,
  useVersioningSidebar,
} from "./VersioningSidebarContext.js";

const VersioningSidebarHeader = (props: { onClose?: () => void }) => {
  const Components = useComponentsContext()!;
  const {
    exitPreview,
    previewSnapshot,
    previewCurrentVersion,
    create,
    canCreate,
  } = useExtension(VersioningExtension);
  const previewedSnapshotId = useExtensionState(VersioningExtension, {
    selector: (state) => state.previewedSnapshotId,
  });
  const snapshots = useExtensionState(VersioningExtension, {
    selector: (state) => state.snapshots,
  });
  const { comparisonEnabled, comparisonMode, setComparisonMode } =
    useVersioningSidebar();

  // Toggling comparison on immediately diffs whatever is currently shown
  // against its previous version; toggling off drops the diff and shows the
  // viewed version (or the live document) on its own.
  const toggleComparison = () => {
    const turningOff = comparisonMode;
    setComparisonMode((mode) => !mode);

    const viewingSnapshot =
      previewedSnapshotId !== undefined &&
      previewedSnapshotId !== CURRENT_VERSION_ID;

    if (turningOff) {
      if (viewingSnapshot) {
        void previewSnapshot(previewedSnapshotId);
      } else if (previewedSnapshotId === CURRENT_VERSION_ID) {
        exitPreview();
      }
      return;
    }

    // Turning on: compare against the previous known version.
    if (viewingSnapshot) {
      const index = snapshots.findIndex((s) => s.id === previewedSnapshotId);
      const previous = index >= 0 ? snapshots[index + 1] : undefined;
      void previewSnapshot(previewedSnapshotId, { compareTo: previous?.id });
    } else {
      // Live / current document → compare against the most recent snapshot.
      const latest = snapshots.find((s) => s.id !== CURRENT_VERSION_ID);
      if (previewCurrentVersion && latest) {
        void previewCurrentVersion({ compareTo: latest.id });
      }
    }
  };

  return (
    <div className="bn-versioning-sidebar-header">
      <div className="bn-versioning-sidebar-header-title">
        <h2 className="bn-versioning-sidebar-title">History</h2>
        <Components.Generic.Toolbar.Root
          variant="action-toolbar"
          className="bn-action-toolbar bn-versioning-sidebar-header-actions"
        >
          {/* Save the live document as a new version, prompting for an
              optional name. An empty (or whitespace-only) name is saved as
              `undefined`; cancelling the prompt aborts the save. */}
          {canCreate && (
            <Components.Generic.Toolbar.Button
              mainTooltip="Save current version"
              onClick={() => {
                const input = window.prompt("Name this version (optional):");
                if (input === null) {
                  return;
                }
                void create?.({ name: input.trim() || undefined });
              }}
            >
              <RiSaveLine size={16} />
            </Components.Generic.Toolbar.Button>
          )}
          {comparisonEnabled && (
            <Components.Generic.Toolbar.Button
              mainTooltip={
                comparisonMode ? "Turn off comparison" : "Turn on comparison"
              }
              isSelected={comparisonMode}
              onClick={toggleComparison}
            >
              <RiArrowLeftRightLine size={16} />
            </Components.Generic.Toolbar.Button>
          )}
        </Components.Generic.Toolbar.Root>
      </div>
      {props.onClose && (
        <Components.Generic.Toolbar.Root
          variant="action-toolbar"
          className="bn-action-toolbar bn-versioning-sidebar-header-actions"
        >
          <Components.Generic.Toolbar.Button
            mainTooltip="Close"
            onClick={() => {
              exitPreview();
              props.onClose?.();
            }}
          >
            <RiCloseLine size={16} />
          </Components.Generic.Toolbar.Button>
        </Components.Generic.Toolbar.Root>
      )}
    </div>
  );
};

const VersioningSidebarContent = (props: { onClose?: () => void }) => {
  const Components = useComponentsContext()!;
  const { list } = useExtension(VersioningExtension);
  const { snapshots } = useExtensionState(VersioningExtension);
  const { activeTab, setActiveTab, showTabs } = useVersioningSidebar();

  // Load the version list when the sidebar is shown. The list is the source of
  // truth for what's rendered — including the "current version" entry that
  // backends surface via `list()` — so the sidebar can't rely on the host
  // having listed already.
  useEffect(() => {
    void list();
  }, [list]);

  // The current-version entry is always kept. Otherwise the "named" tab shows
  // only user-created named versions, while the "history" tab shows the full
  // edit timeline.
  //
  // A `history-*` snapshot is history-only regardless of any name: renaming
  // such a row writes a name into the mutable name store, but it must never
  // graduate into the "named" tab. So the named tab keeps only non-history
  // snapshots that carry a name.
  const keep = (snapshot: VersionSnapshot) => {
    if (snapshot.id === CURRENT_VERSION_ID) {
      return true;
    }
    return activeTab === "named"
      ? typeof snapshot.id === "string" &&
          !snapshot.id.startsWith("history-") &&
          snapshot.name !== undefined
      : true;
  };

  return (
    <Components.Versioning.Sidebar className="bn-versioning-sidebar">
      <VersioningSidebarHeader onClose={props.onClose} />
      {showTabs && (
        <div className="bn-versioning-sidebar-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className="bn-versioning-sidebar-tab"
            aria-selected={activeTab === "history"}
            onClick={() => setActiveTab("history")}
          >
            Version History
          </button>
          <button
            type="button"
            role="tab"
            className="bn-versioning-sidebar-tab"
            aria-selected={activeTab === "named"}
            onClick={() => setActiveTab("named")}
          >
            Named Versions
          </button>
        </div>
      )}
      {snapshots.filter(keep).map((snapshot, i, arr) => {
        // The current version is driven by the backend's `list()` (it sorts
        // newest-first, so it lands at index 0) and is previewed live rather
        // than fetched as a stored snapshot. Its id is the CURRENT_VERSION_ID
        // symbol, so derive a string React key for it.
        if (snapshot.id === CURRENT_VERSION_ID) {
          return (
            <CurrentSnapshot
              key="current-version"
              snapshot={snapshot}
              previousSnapshot={arr[i + 1]}
            />
          );
        }
        return (
          <Snapshot
            key={snapshot.id}
            snapshot={snapshot}
            previousSnapshot={arr[i + 1]}
          />
        );
      })}
    </Components.Versioning.Sidebar>
  );
};

export const VersioningSidebar = (props: {
  /**
   * When set, pins the sidebar to a single view and hides the tab switcher:
   * `"named"` shows only user-created named versions, `"all"` shows the full
   * edit history. When omitted, both tabs are shown (default active `"named"`).
   */
  filter?: "named" | "all";
  /**
   * Called when the user closes the history panel via the header's close
   * button. The host is responsible for hiding the panel; the sidebar exits
   * preview mode (restoring editing) before invoking this. When omitted, the
   * close button is not rendered.
   */
  onClose?: () => void;
}) => {
  return (
    <VersioningSidebarProvider filter={props.filter}>
      <VersioningSidebarContent onClose={props.onClose} />
    </VersioningSidebarProvider>
  );
};
