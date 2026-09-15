import {
  VersioningExtension,
  type VersionSnapshot,
} from "@blocknote/core/extensions";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { GoDiff } from "react-icons/go";
import { RiBookmarkLine, RiCloseLine, RiSaveLine } from "react-icons/ri";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { Snapshot } from "./Snapshot.js";
import { usePreviewRow } from "./usePreviewRow.js";
import { VersionMenu } from "./VersionMenu/VersionMenu.js";
import {
  useVersioningSidebar,
  VersioningSidebarProvider,
} from "./VersioningSidebarContext.js";

export type VersioningSidebarProps = {
  /**
   * Called when the user closes the history panel via the header's close
   * button. The host is responsible for hiding the panel; the sidebar exits
   * preview mode (restoring editing) before invoking this. When omitted, the
   * close button is not rendered.
   */
  onClose?: () => void;
  /**
   * Initial state of the toggles. Both are the user's from then on — pass a
   * changing `key` to reset them.
   * @default false
   */
  defaultNamedOnly?: boolean;
  /**
   * Off by default: the first thing a reader wants is the document as it was,
   * not a marked-up diff.
   * @default false
   */
  defaultComparisonMode?: boolean;
  /**
   * The menu rendered in each row's "..." trigger. Compose it from
   * `VersionMenu`, the default items and your own `VersionMenuItem`s; every
   * item can read the row it's in via `useVersionSnapshot()`.
   * @default <VersionMenu />
   */
  snapshotMenu?: ReactNode;
  /**
   * The spinner shown while the version list loads.
   * @default <Components.Versioning.Loader />
   */
  loadingIndicator?: ReactNode;
};

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

/**
 * The sidebar's list of versions: a list whose items are {@link Snapshot} rows,
 * newest first, with the current version pinned at the top.
 *
 * A plain list rather than a listbox: the rows carry their own interactive
 * content (the "..." menu, the inline name field), which an `option` may not.
 */
export function VersioningSidebarList() {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const { namedOnly, loadingIndicator, run } = useVersioningSidebar();
  const previewRow = usePreviewRow();

  const list = useExtensionState(VersioningExtension, {
    selector: (state) => state.list,
  });
  const listing = useExtensionState(VersioningExtension, {
    selector: (state) => state.status.type === "listing",
  });

  const listRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const focusRow = useCallback((index: number) => {
    const items =
      listRef.current?.querySelectorAll<HTMLElement>('[role="listitem"]');
    if (!items || items.length === 0) {
      return;
    }
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    setActiveIndex(clamped);
    const row = items[clamped]!;
    row.focus();

    // Native focus scrolling doesn't account for the sticky header. Reveal
    // the whole row beneath its actual height, including the focus ring.
    const sidebar = row.closest<HTMLElement>(".bn-versioning-sidebar");
    const header = sidebar?.querySelector(".bn-versioning-sidebar-header");
    if (sidebar && header) {
      const hiddenHeight =
        header.getBoundingClientRect().bottom +
        4 -
        row.getBoundingClientRect().top;
      if (hiddenHeight > 0) {
        sidebar.scrollTop -= hiddenHeight;
      }
    }
  }, []);

  if (!list.loaded) {
    return (
      <div className="bn-versioning-sidebar-loading" role="status">
        {loadingIndicator ?? (
          <Components.Versioning.Loader className="bn-suggestion-menu-loader" />
        )}
        <span className="bn-visually-hidden">{dict.versioning.loading}</span>
      </div>
    );
  }

  // The current row is always first and always shown: it's the document as it
  // is now, which the named-only filter has no business hiding.
  const rows: Array<{ snapshot: VersionSnapshot; isCurrent: boolean }> = [
    { snapshot: list.current, isCurrent: true },
    ...list.snapshots
      // A version is "named" exactly when a user typed a name for it.
      .filter((snapshot) => !namedOnly || snapshot.name !== undefined)
      .map((snapshot) => ({ snapshot, isCurrent: false })),
  ];

  function handleKeyDown(event: KeyboardEvent, index: number) {
    // Text inputs (the inline rename) and the row menu handle their own keys.
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT" || target.closest(".bn-snapshot-menu")) {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusRow(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusRow(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusRow(0);
        break;
      case "End":
        event.preventDefault();
        focusRow(rows.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        void run(() => previewRow(rows[index]!.snapshot));
        break;
      default:
        break;
    }
  }

  return (
    <>
      <div
        className="bn-versioning-sidebar-list"
        role="list"
        aria-label={dict.versioning.versions_list}
        aria-busy={listing || undefined}
        ref={listRef}
      >
        {rows.map((row, index) => (
          <Snapshot
            key={row.snapshot.id}
            id={`bn-snapshot-${row.snapshot.id}`}
            snapshot={row.snapshot}
            previousSnapshot={rows[index + 1]?.snapshot}
            isCurrent={row.isCurrent}
            // Roving tabindex: one stop for the whole list, arrows move within
            // it. Falls back to the selected row so tabbing in lands somewhere
            // meaningful.
            tabIndex={
              index === activeIndex ||
              (activeIndex >= rows.length && index === 0)
                ? 0
                : -1
            }
            onKeyDown={(event) => handleKeyDown(event, index)}
            onFocus={() => setActiveIndex(index)}
          />
        ))}
      </div>
      {rows.length === 1 && (
        <div className="bn-versioning-sidebar-empty">
          {/* Only the current row is rendered: either nothing is stored, or
           * the named-only filter is hiding every unnamed version. */}
          {list.snapshots.length > 0
            ? dict.versioning.empty_named_only
            : dict.versioning.empty}
        </div>
      )}
    </>
  );
}

function VersioningSidebarContent(props: { onClose?: () => void }) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const versioning = useExtension(VersioningExtension);
  const { run, failed } = useVersioningSidebar();
  const previewRow = usePreviewRow();

  // Read at mount only: the initial selection uses whatever comparison mode the
  // panel opened with, and must not re-run when the user toggles it (the header
  // re-previews for that).
  const latest = useRef({ previewRow, run });
  latest.current = { previewRow, run };

  // Open the panel on the current version, read-only. One `list()` per mount:
  // the history is a snapshot of the moment the panel was opened, and closing
  // and reopening is what refreshes it.
  useEffect(() => {
    void latest.current.run(
      () => versioning.list(),
      async (loaded) => {
        if (versioning.store.state.view.mode === "live") {
          await latest.current.previewRow(loaded.current);
        }
      },
    );
  }, [versioning]);

  return (
    <Components.Versioning.Sidebar className="bn-versioning-sidebar">
      <VersioningSidebarHeader onClose={props.onClose} />
      {failed && (
        <div className="bn-versioning-sidebar-error" role="alert">
          {dict.versioning.action_failed}
        </div>
      )}
      <VersioningSidebarList />
    </Components.Versioning.Sidebar>
  );
}

/**
 * The version-history panel: a list of the document's versions, newest first,
 * with the current version at the top.
 *
 * While it is open the editor is read-only and shows the selected version —
 * the panel always has a selection, starting on the current version.
 */
export function VersioningSidebar(props: VersioningSidebarProps) {
  return (
    <VersioningSidebarProvider
      defaultNamedOnly={props.defaultNamedOnly}
      defaultComparisonMode={props.defaultComparisonMode}
      snapshotMenu={props.snapshotMenu ?? <VersionMenu />}
      loadingIndicator={props.loadingIndicator}
    >
      <VersioningSidebarContent onClose={props.onClose} />
    </VersioningSidebarProvider>
  );
}
