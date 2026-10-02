import { VersioningExtension } from "@blocknote/core/extensions";
import { type ReactNode } from "react";
import { GoDiff } from "react-icons/go";
import { RiBookmarkLine, RiCloseLine } from "react-icons/ri";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useExtension } from "../../hooks/useExtension.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { usePreviewRow } from "./usePreviewRow.js";
import { useVersioningSidebar } from "./VersioningSidebarContext.js";
import { getShownVersionRow, getVisibleVersionRows } from "./visibleHistory.js";

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
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const { store, canCompare } = useExtension(VersioningExtension);
  const {
    comparisonMode,
    setComparisonMode,
    namedOnly,
    setNamedOnly,
    run,
    close,
  } = useVersioningSidebar();
  const previewRow = usePreviewRow();
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
    const shown = getShownVersionRow(list, view);
    if (shown) {
      void run(() =>
        previewRow(shown.snapshot, {
          compareTo: { type: next ? "previous" : "none" },
        }),
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
    const shown = getShownVersionRow(list, view);
    const visibleRows = getVisibleVersionRows(list, next);
    const visibleShown = visibleRows.find(
      (row) => row.snapshot.id === shown?.snapshot.id,
    );
    void run(() =>
      previewRow(visibleShown?.snapshot ?? list.current, {
        compareTo: { type: "none" },
      }),
    );
  }

  return (
    <Components.Versioning.Header
      className="bn-versioning-sidebar-header"
      title={dict.versioning.title}
      actions={
        <Components.Generic.Toolbar.Root
          variant="action-toolbar"
          trapFocus={false}
          aria-label={dict.versioning.title}
          className="bn-action-toolbar bn-versioning-sidebar-header-actions"
        >
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
      }
      closeAction={
        props.onClose ? (
          <Components.Generic.Toolbar.Root
            variant="action-toolbar"
            trapFocus={false}
            aria-label={dict.versioning.close}
            className="bn-action-toolbar bn-versioning-sidebar-header-actions"
          >
            <HeaderButton
              label={dict.versioning.close}
              onClick={() => {
                close();
                editor.focus();
                props.onClose?.();
              }}
            >
              <RiCloseLine size={16} />
            </HeaderButton>
          </Components.Generic.Toolbar.Root>
        ) : undefined
      }
    />
  );
}
