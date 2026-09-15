import {
  VersioningExtension,
  type VersioningView,
  type VersionSnapshot,
} from "@blocknote/core/extensions";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { GoDiff } from "react-icons/go";
import { RiMoreFill } from "react-icons/ri";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { dateToString } from "./dateToString.js";
import { usePreviewRow } from "./usePreviewRow.js";
import { useSnapshotLabel } from "./useVersionUsers.js";
import { VersionMenu } from "./VersionMenu/VersionMenu.js";
import { VersionName } from "./VersionName.js";
import { useVersioningSidebar } from "./VersioningSidebarContext.js";
import { VersionSnapshotProvider } from "./VersionSnapshotContext.js";

/** Whether `view` is showing this row's version. */
function isSelectedRow(
  view: VersioningView,
  row: VersionSnapshot,
  isCurrent: boolean,
): boolean {
  switch (view.mode) {
    case "live":
      return false;
    case "current":
      return isCurrent;
    case "snapshot":
      return view.snapshotId === row.id;
  }
}

/**
 * Focus the name field and reclaim focus restored by a closing menu.
 * Stop after a second or as soon as the user moves focus themselves.
 */
function focusAndReclaim(input: HTMLInputElement) {
  input.focus();
  input.select();

  const row = input.closest('[role="listitem"]');
  if (!row) {
    return;
  }
  let timeout: ReturnType<typeof setTimeout>;
  const stop = () => {
    clearTimeout(timeout);
    row.removeEventListener("focusin", reclaim);
    document.removeEventListener("pointerdown", stop, true);
    document.removeEventListener("keydown", stop, true);
  };
  const reclaim = (event: Event) => {
    if (event.target === input) {
      return;
    }
    input.focus();
    input.select();
  };

  timeout = setTimeout(stop, 1000);
  row.addEventListener("focusin", reclaim);
  document.addEventListener("pointerdown", stop, true);
  document.addEventListener("keydown", stop, true);
}

/**
 * A single row of the version-history sidebar.
 *
 * The current version and stored versions are the same row: both show a name, a
 * date and their authors, both are selectable, and both carry the "..." menu —
 * they only differ in where their content comes from, which is the extension's
 * concern, not this component's. `isCurrent` is what the few genuine
 * differences (the "Current" badge, the default name) key off.
 */
export function Snapshot(props: {
  snapshot: VersionSnapshot;
  /** The previous visible version in the filtered list. */
  previousSnapshot?: VersionSnapshot;
  isCurrent: boolean;
  /** DOM id for this row. */
  id: string;
  tabIndex: number;
  onKeyDown: (event: KeyboardEvent) => void;
  onFocus: () => void;
}) {
  const { snapshot, isCurrent } = props;
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const { create, rename } = useExtension(VersioningExtension);
  const { snapshotMenu, run, focusNameFor, setFocusNameFor } =
    useVersioningSidebar();
  const previewRow = usePreviewRow();

  const view = useExtensionState(VersioningExtension, {
    selector: (state) => state.view,
  });
  const status = useExtensionState(VersioningExtension, {
    selector: (state) => state.status,
  });

  const nameInput = useRef<HTMLInputElement>(null);

  const selected = isSelectedRow(view, snapshot, isCurrent);
  const comparing =
    view.mode !== "live" && view.compareToId === snapshot.id && !selected;
  const secondaryLabel = useSnapshotLabel(snapshot);
  const dateString = dateToString(new Date(snapshot.createdAt));

  // An unnamed version shows its date instead — a bare timestamp is how an
  // automatic version identifies itself — except the current row, which is a
  // place in the list rather than a moment.
  const placeholder = isCurrent ? dict.versioning.current_version : dateString;
  // Naming the current version goes through `create`; every other rename is a
  // `rename`. Both are gated on the backend actually supporting them.
  const commitsViaCreate = isCurrent && snapshot.name === undefined;
  const canEditName = (commitsViaCreate ? create : rename) !== undefined;
  // The name is a field on the selected row only; everywhere else it's text,
  // and the first click on the row selects it rather than starting a rename.
  const editable = selected && canEditName === true;

  // Save/Rename requests focus before selecting the row and mounting its input.
  useEffect(() => {
    if (focusNameFor !== snapshot.id) {
      return;
    }
    if (editable && nameInput.current) {
      setFocusNameFor(undefined);
      focusAndReclaim(nameInput.current);
    } else if (selected) {
      setFocusNameFor(undefined);
    }
  }, [focusNameFor, setFocusNameFor, snapshot.id, editable, selected]);

  // Only the selected row is loading: `status` carries the view being switched
  // to, which is exactly the row the user clicked. Announced on the row only;
  // what the eye gets is the editor, which the extension marks once a load has
  // taken a while (see LOADING_PREVIEW_CLASS).
  const loading =
    status.type === "loading-preview" &&
    isSelectedRow(status.view, snapshot, isCurrent);

  function handleSelect() {
    void run(() => previewRow(snapshot));
  }

  /**
   * "Rename" from the row's menu. The field only exists on the selected row,
   * so on any other row this selects it first and lets the row take the focus
   * once the field is there (the same hand-off "Save version" uses).
   */
  function startRename() {
    if (editable && nameInput.current) {
      focusAndReclaim(nameInput.current);
      return;
    }
    setFocusNameFor(snapshot.id);
    handleSelect();
  }

  function commitName(name: string | undefined) {
    if (commitsViaCreate && create) {
      void run(() => create({ name }));
    } else if (!commitsViaCreate && rename) {
      void run(() => rename(snapshot.id, name));
    }
  }

  const actions = (
    <Components.Generic.Toolbar.Root
      variant="action-toolbar"
      className="bn-action-toolbar"
    >
      <Components.Generic.Menu.Root position="bottom-start">
        <Components.Generic.Menu.Trigger>
          <Components.Generic.Toolbar.Button
            className="bn-snapshot-menu-trigger"
            label={dict.versioning.more_actions}
            mainTooltip={dict.versioning.more_actions}
            variant="compact"
            onClick={(event) => {
              // Not `preventDefault`: Ariakit's disclosure bails on a
              // default-prevented click, so the menu would never open.
              // Stopping propagation is all the row needs — the click must
              // not also select the row behind the trigger.
              event.stopPropagation();
            }}
          >
            <RiMoreFill size={16} />
          </Components.Generic.Toolbar.Button>
        </Components.Generic.Menu.Trigger>
        {snapshotMenu ?? <VersionMenu />}
      </Components.Generic.Menu.Root>
    </Components.Generic.Toolbar.Root>
  );

  return (
    <VersionSnapshotProvider
      value={{
        snapshot,
        previousSnapshot: props.previousSnapshot,
        isCurrent,
        selected,
        comparing,
        startRename,
      }}
    >
      <Components.Versioning.Snapshot
        className={
          selected && view.mode !== "live" && view.compareToId !== undefined
            ? "bn-snapshot bn-snapshot-comparison-source"
            : "bn-snapshot"
        }
        id={props.id}
        selected={selected}
        comparing={comparing}
        aria-busy={loading || undefined}
        tabIndex={props.tabIndex}
        onClick={handleSelect}
        onKeyDown={props.onKeyDown}
        onFocus={props.onFocus}
        actions={actions}
      >
        {comparing && (
          <div className="bn-snapshot-comparing-to">
            <GoDiff size={14} />
            <span>{dict.versioning.comparing_to}</span>
          </div>
        )}
        <div className="bn-snapshot-body">
          <div className="bn-snapshot-title-row">
            <VersionName
              name={snapshot.name}
              placeholder={placeholder}
              editable={editable}
              inputRef={nameInput}
              onCommit={commitName}
            />
          </div>
          {/* What the row is, once a name has taken that slot: the date for a
              stored version, and "Current version" for the current row — the
              row that would otherwise read as just another named version. */}
          {isCurrent && snapshot.name !== undefined ? (
            <div className="bn-snapshot-date">
              {dict.versioning.current_version}
            </div>
          ) : isCurrent || snapshot.name !== undefined ? (
            <div className="bn-snapshot-date">{dateString}</div>
          ) : null}
          {snapshot.restoredFrom !== undefined && (
            <div className="bn-snapshot-original-date">
              {dict.versioning.restored_from(
                dateToString(new Date(snapshot.restoredFrom.createdAt)),
              )}
            </div>
          )}
          {secondaryLabel !== undefined && (
            <div className="bn-snapshot-secondary-label">{secondaryLabel}</div>
          )}
        </div>
      </Components.Versioning.Snapshot>
    </VersionSnapshotProvider>
  );
}
