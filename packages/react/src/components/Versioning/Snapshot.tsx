import {
  VersioningExtension,
  type VersioningView,
  type VersionSnapshot,
} from "@blocknote/core/extensions";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { GoDiff } from "react-icons/go";
import { RiMoreFill } from "react-icons/ri";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import type { VersioningSnapshotState } from "../../editor/ComponentsContext.js";
import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { dateToString } from "./dateToString.js";
import { usePreviewRow } from "./usePreviewRow.js";
import { useSnapshotLabel } from "./useVersionUsers.js";
import { VersionName } from "./VersionName.js";
import { useVersioningSidebar } from "./VersioningSidebarContext.js";
import { VersionSnapshotProvider } from "./VersionSnapshotContext.js";

/** Whether `view` is showing this row's version. */
function getSnapshotState(
  view: VersioningView,
  row: VersionSnapshot,
  isCurrent: boolean,
): VersioningSnapshotState {
  switch (view.mode) {
    case "live":
      return "default";
    case "current": {
      if (view.compareToId === row.id && !isCurrent) {
        return "comparison-baseline";
      }
      if (!isCurrent) {
        return "default";
      }
      return view.compareToId === undefined ? "selected" : "comparison-source";
    }
    case "snapshot": {
      if (view.snapshotId === row.id) {
        return view.compareToId === undefined
          ? "selected"
          : "comparison-source";
      }
      return view.compareToId === row.id ? "comparison-baseline" : "default";
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

/** Shared current/stored version row; `isCurrent` controls naming and labels. */
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
  const dict = useDictionary();
  const { create, rename, getLoadingState } = useExtension(VersioningExtension);
  const { snapshotMenu, run, focusNameFor, setFocusNameFor } =
    useVersioningSidebar();
  const previewRow = usePreviewRow();

  const view = useExtensionState(VersioningExtension, {
    selector: (state) => state.view,
  });
  const status = useExtensionState(VersioningExtension, {
    selector: getLoadingState,
  });

  const nameInput = useRef<HTMLInputElement>(null);

  const state = getSnapshotState(view, snapshot, isCurrent);
  const selected = isSelectedState(state);
  const comparing = state === "comparison-baseline";
  const secondaryLabel = useSnapshotLabel(snapshot);
  const dateString = dateToString(new Date(snapshot.createdAt));
  const rowDate =
    isCurrent && snapshot.name !== undefined
      ? dict.versioning.current_version
      : isCurrent || snapshot.name !== undefined
        ? dateString
        : undefined;
  const restoredFrom =
    snapshot.restoredFrom !== undefined
      ? dict.versioning.restored_from(
          dateToString(new Date(snapshot.restoredFrom.createdAt)),
        )
      : undefined;

  // An unnamed version shows its date instead — a bare timestamp is how an
  // automatic version identifies itself — except the current row, which is a
  // place in the list rather than a moment.
  const placeholder = isCurrent ? dict.versioning.current_version : dateString;
  const accessibleLabel = [
    snapshot.name ?? placeholder,
    isCurrent && snapshot.name !== undefined
      ? dict.versioning.current_version
      : undefined,
    isCurrent || snapshot.name !== undefined ? dateString : undefined,
    comparing ? dict.versioning.comparing_to : undefined,
    secondaryLabel,
  ]
    .filter(Boolean)
    .join(", ");
  // Naming the current version goes through `create`; every other rename is a
  // `rename`. Both are gated on the backend actually supporting them.
  const commitsViaCreate = isCurrent && snapshot.name === undefined;
  const canEditName = (commitsViaCreate ? create : rename) !== undefined;
  // The name is a field on the selected row only; everywhere else it's text,
  // and the first click on the row selects it rather than starting a rename.
  const editable = selected && canEditName === true;

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

  // Only the selected row is loading: `status` carries the view being switched
  // to, which is exactly the row the user clicked. Announced on the row only;
  // what the eye gets is the editor, which the extension marks for every load
  // (see LOADING_PREVIEW_CLASS).
  const loading =
    status.type === "loading-preview" &&
    isSelectedState(getSnapshotState(status.view, snapshot, isCurrent));

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

  function commitName(name: string | undefined) {
    if (commitsViaCreate && create) {
      void run(() => create({ name }));
    } else if (!commitsViaCreate && rename) {
      void run(() => rename(snapshot.id, name));
    }
  }

  const actions =
    snapshotMenu != null && snapshotMenu !== false ? (
      <Components.Generic.Toolbar.Root
        variant="action-toolbar"
        trapFocus={false}
        aria-label={`${dict.versioning.more_actions}: ${accessibleLabel}`}
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
          {snapshotMenu}
        </Components.Generic.Menu.Root>
      </Components.Generic.Toolbar.Root>
    ) : null;

  return (
    <VersionSnapshotProvider
      value={{
        snapshot,
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
