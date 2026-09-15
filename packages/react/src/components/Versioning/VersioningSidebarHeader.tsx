import { VersioningExtension } from "@blocknote/core/extensions";
import { type ReactNode } from "react";
import { GoDiff } from "react-icons/go";
import { RiBookmarkLine, RiCloseLine, RiSaveLine } from "react-icons/ri";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useExtension } from "../../hooks/useExtension.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { usePreviewRow } from "./usePreviewRow.js";
import { useVersioningSidebar } from "./VersioningSidebarContext.js";

/** A header button, whose tooltip and accessible name are the same string. */
function HeaderButton(props: {
  label: string;
  isSelected?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const Components = useComponentsContext()!;

  return (
    <Components.Generic.Toolbar.Button
      label={props.label}
      mainTooltip={props.label}
      isSelected={props.isSelected}
      onClick={props.onClick}
    >
      {props.children}
    </Components.Generic.Toolbar.Button>
  );
}

export function VersioningSidebarHeader(props: { onClose?: () => void }) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const { store, canCompare, create } = useExtension(VersioningExtension);
  const {
    comparisonMode,
    setComparisonMode,
    namedOnly,
    setNamedOnly,
    run,
    setFocusNameFor,
    close,
  } = useVersioningSidebar();
  const previewRow = usePreviewRow();
  // Save unnamed, then reveal and focus the new row's name field.
  function saveVersion() {
    if (!create) {
      return;
    }
    void run(create, async (created) => {
      setNamedOnly(false);
      // Request focus before selecting: the selected row's effect consumes it.
      setFocusNameFor(created.id);
      await previewRow(created, { namedOnly: false });
    });
  }

  // Toggling comparison re-previews whatever is on screen with the new
  // baseline, so the toggle takes effect immediately instead of waiting for the
  // next row click.
  function toggleComparison() {
    const next = !comparisonMode;
    setComparisonMode(next);

    const { view, list } = store.state;
    if (view.mode === "live" || !list.loaded) {
      return;
    }
    const shown =
      view.mode === "current"
        ? list.current
        : list.snapshots.find((s) => s.id === view.snapshotId);
    if (shown) {
      void run(() =>
        previewRow(shown, { compareTo: { type: next ? "previous" : "none" } }),
      );
    }
  }

  function toggleNamedOnly() {
    const next = !namedOnly;
    setNamedOnly(next);
    // A filter change ends the comparison instead of leaving a potentially
    // hidden baseline active. Keep the viewed version if it survives the
    // filter; otherwise return to Current so the list retains a selection.
    setComparisonMode(false);
    const { view, list } = store.state;
    if (view.mode === "live" || !list.loaded) {
      return;
    }
    const shown =
      view.mode === "snapshot"
        ? list.snapshots.find((snapshot) => snapshot.id === view.snapshotId)
        : list.current;
    void run(() =>
      previewRow(
        shown && (!next || shown.name !== undefined) ? shown : list.current,
        {
          compareTo: { type: "none" },
        },
      ),
    );
  }

  return (
    <div className="bn-versioning-sidebar-header">
      <div className="bn-versioning-sidebar-header-title">
        <h2 className="bn-versioning-sidebar-title">{dict.versioning.title}</h2>
        <Components.Generic.Toolbar.Root
          variant="action-toolbar"
          className="bn-action-toolbar bn-versioning-sidebar-header-actions"
        >
          {create && (
            <HeaderButton
              label={dict.versioning.save_version}
              onClick={saveVersion}
            >
              <RiSaveLine size={16} />
            </HeaderButton>
          )}
          <HeaderButton
            label={
              namedOnly
                ? dict.versioning.show_all
                : dict.versioning.show_named_only
            }
            isSelected={namedOnly}
            onClick={toggleNamedOnly}
          >
            <RiBookmarkLine size={16} />
          </HeaderButton>
          {canCompare && (
            <HeaderButton
              label={
                comparisonMode
                  ? dict.versioning.comparison_off
                  : dict.versioning.comparison_on
              }
              isSelected={comparisonMode}
              onClick={toggleComparison}
            >
              <GoDiff size={16} />
            </HeaderButton>
          )}
        </Components.Generic.Toolbar.Root>
      </div>
      {props.onClose && (
        <Components.Generic.Toolbar.Root
          variant="action-toolbar"
          className="bn-action-toolbar bn-versioning-sidebar-header-actions"
        >
          <HeaderButton
            label={dict.versioning.close}
            onClick={() => {
              close();
              props.onClose?.();
            }}
          >
            <RiCloseLine size={16} />
          </HeaderButton>
        </Components.Generic.Toolbar.Root>
      )}
    </div>
  );
}
