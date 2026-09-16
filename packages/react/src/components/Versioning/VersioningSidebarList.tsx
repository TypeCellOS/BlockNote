import {
  VersioningExtension,
  type VersionSnapshot,
} from "@blocknote/core/extensions";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useExtensionState } from "../../hooks/useExtension.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { Snapshot } from "./Snapshot.js";
import { usePreviewRow } from "./usePreviewRow.js";
import { useVersioningSidebar } from "./VersioningSidebarContext.js";

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

  const listId = useId();
  const focusedRowId = useRef<string | undefined>(undefined);
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

  useEffect(() => {
    if (!list.loaded || !focusedRowId.current) {
      return;
    }
    const visibleIds = [
      list.current.id,
      ...list.snapshots
        .filter((snapshot) => !namedOnly || snapshot.name !== undefined)
        .map((snapshot) => snapshot.id),
    ];
    // Removing the focused DOM node drops focus onto body. Return it to the
    // nearest remaining row without stealing focus from another control.
    if (
      !visibleIds.includes(focusedRowId.current) &&
      document.activeElement === document.body
    ) {
      focusRow(activeIndex);
    }
  }, [list, namedOnly, activeIndex, focusRow]);

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
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            focusedRowId.current = undefined;
          }
        }}
      >
        {rows.map((row, index) => (
          <Snapshot
            key={row.snapshot.id}
            id={`${listId}-snapshot-${row.snapshot.id}`}
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
            onFocus={() => {
              focusedRowId.current = row.snapshot.id;
              setActiveIndex(index);
            }}
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
