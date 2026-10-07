import {
  formatVersionDate,
  type VersioningState,
  type VersionSnapshot,
} from "@blocknote/core/extensions";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { GoDiff } from "react-icons/go";
import { RiMoreFill } from "react-icons/ri";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import type { VersioningSnapshotState } from "../../editor/ComponentsContext.js";
import { usePortalElement } from "../../editor/PortalElementOverride.js";
import { useVersioning, useVersioningState } from "./useVersioning.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { usePreviewRow } from "./usePreviewRow.js";
import { useSnapshotLabel } from "./useVersionUsers.js";
import { VersionName } from "./VersionName.js";
import { useVersioningSidebar } from "./VersioningSidebarContext.js";
import { VersionSnapshotProvider } from "./VersionSnapshotContext.js";
import { getVersionSelection } from "./visibleHistory.js";
import { useReconcileComparison } from "./useReconcileComparison.js";

/** Whether `view` is showing this row's version. */
function getSnapshotState(
  view: VersioningState,
  row: VersionSnapshot,
  isCurrent: boolean,
): VersioningSnapshotState {
  switch (view.mode) {
    case "live":
      return "default";
    case "versions": {
      const selection = view.pending ?? view.displayed;
      if (selection.type === "current" ? isCurrent : selection.id === row.id) {
        return view.compareTo === undefined ? "selected" : "comparison-source";
      }
      return view.compareTo === row.id ? "comparison-baseline" : "default";
    }
  }
}

function isSelectedState(state: VersioningSnapshotState): boolean {
  return state === "selected" || state === "comparison-source";
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

/** Shared current/stored version row; `isCurrent` controls labels and actions. */
export function Snapshot(props: {
  snapshot: VersionSnapshot;
  isCurrent: boolean;
  /** DOM id for this row. */
  id: string;
  tabIndex: number;
  onKeyDown: (event: KeyboardEvent) => void;
  onFocus: () => void;
}) {
  const { snapshot, isCurrent } = props;
  const Components = useComponentsContext()!;
  const portalElement = usePortalElement();
  const dict = useDictionary();
  const versioning = useVersioning();
  const { create, rename, canCreate, canRename, store } = versioning;
  const { snapshotMenu, run, focusNameFor, setFocusNameFor } =
    useVersioningSidebar();
  const previewRow = usePreviewRow();
  const reconcileComparison = useReconcileComparison();

  const view = useVersioningState();
  const isStart =
    versioning.historyIncludesBeginning &&
    view.mode === "versions" &&
    view.history.data?.at(-1)?.id === snapshot.id;
  const selection = getVersionSelection(view, snapshot, isCurrent);

  const nameInput = useRef<HTMLInputElement>(null);

  const state = getSnapshotState(view, snapshot, isCurrent);
  const selected = isSelectedState(state);
  const comparing = state === "comparison-baseline";
  const secondaryLabel = useSnapshotLabel(snapshot);
  const dateString = formatVersionDate(snapshot.createdAt);
  const rowDate =
    isCurrent || isStart || snapshot.name !== undefined
      ? dateString
      : undefined;
  const restoredFrom =
    snapshot.restoredFrom !== undefined
      ? dict.versioning.restored_from(
          formatVersionDate(snapshot.restoredFrom.createdAt),
        )
      : undefined;

  // Current and the first recorded version have labels; other unnamed versions show their date.
  const placeholder = isCurrent
    ? dict.versioning.current_version
    : isStart
      ? dict.versioning.start_of_document
      : dateString;
  const accessibleLabel = [
    snapshot.name ?? placeholder,
    rowDate,
    comparing ? dict.versioning.comparing_to : undefined,
    secondaryLabel,
  ]
    .filter(Boolean)
    .join(", ");
  // Only the frozen capture needs creating. Stored checkpoints are renamed,
  // including the checkpoint labeled Current.
  const canEditName = selection.type === "current" ? canCreate : canRename;
  // Both sides of an active comparison can be named without switching the
  // preview. Elsewhere the first click selects the row before renaming it.
  const editable = (selected || comparing) && canEditName === true;

  // Rename requests focus before selecting the row and mounting its input.
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

  // Announce loading on the pending row. The extension shows the editor's
  // loading indicator for the entire pending selection.
  const loading =
    view.mode === "versions" &&
    view.pending !== undefined &&
    (view.pending.type === "current"
      ? isCurrent
      : view.pending.id === snapshot.id);

  function handleSelect() {
    void run(() => previewRow(snapshot));
  }

  /** Select the row to mount its name field, then focus it. */
  function startRename() {
    if (editable && nameInput.current) {
      focusAndReclaim(nameInput.current);
      return;
    }
    setFocusNameFor(snapshot.id);
    handleSelect();
  }

  async function commitName(name: string | undefined) {
    const before = store.state;
    const result = await run(
      () =>
        selection.type === "current"
          ? create(name)
          : rename(selection.id, name),
      () =>
        selection.type === "snapshot"
          ? reconcileComparison(before, selection.id)
          : undefined,
    );
    return result.status === "done";
  }

  const actions =
    snapshotMenu != null && snapshotMenu !== false ? (
      <Components.Generic.Toolbar.Root
        variant="action-toolbar"
        trapFocus={false}
        aria-label={`${dict.versioning.more_actions}: ${accessibleLabel}`}
        className="bn-action-toolbar"
      >
        <Components.Generic.Menu.Root
          position="bottom-start"
          portalElement={portalElement}
        >
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
          {snapshotMenu}
        </Components.Generic.Menu.Root>
      </Components.Generic.Toolbar.Root>
    ) : null;

  return (
    <VersionSnapshotProvider
      value={{
        snapshot,
        selection,
        isCurrent,
        state,
        startRename,
      }}
    >
      <Components.Versioning.Snapshot
        className="bn-snapshot"
        id={props.id}
        aria-label={accessibleLabel}
        state={state}
        aria-busy={loading || undefined}
        tabIndex={props.tabIndex}
        onClick={handleSelect}
        onKeyDown={props.onKeyDown}
        onFocus={props.onFocus}
        actions={actions}
        name={
          <VersionName
            name={snapshot.name}
            placeholder={placeholder}
            editable={editable}
            inputRef={nameInput}
            onCommit={commitName}
          />
        }
        date={rowDate}
        restoredFrom={restoredFrom}
        secondaryLabel={secondaryLabel}
        comparingLabel={comparing ? dict.versioning.comparing_to : undefined}
        comparingIcon={comparing ? <GoDiff size={14} /> : undefined}
      />
    </VersionSnapshotProvider>
  );
}
