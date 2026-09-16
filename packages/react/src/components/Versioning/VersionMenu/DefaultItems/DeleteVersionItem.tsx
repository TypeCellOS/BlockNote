import { VersioningExtension } from "@blocknote/core/extensions";
import { RiDeleteBinLine } from "react-icons/ri";

import { useDictionary } from "../../../../i18n/dictionary.js";
import { useExtension } from "../../../../hooks/useExtension.js";
import { usePreviewRow } from "../../usePreviewRow.js";
import { useVersioningSidebar } from "../../VersioningSidebarContext.js";
import { useVersionSnapshot } from "../../VersionSnapshotContext.js";
import {
  VersionMenuItem,
  type DefaultVersionMenuItemProps,
  type VersionMenuAction,
} from "../VersionMenuItem.js";

/**
 * "Delete" — removes a *named* stored version.
 *
 * Only named stored rows can be deleted: an automatic version is a point in the
 * document's history, not something a user created, so there's nothing to
 * delete. On backends with continuous history, deleting only drops the name and
 * the row stays as an automatic version.
 *
 * If the deleted version was the one on screen (or its diff baseline), the
 * sidebar re-selects the current version: the panel always has a selection,
 * and the editor stays read-only for as long as it's open.
 */
export function useDeleteVersionAction(): VersionMenuAction {
  const { remove, store } = useExtension(VersioningExtension);
  const { run, namedOnly } = useVersioningSidebar();
  const previewRow = usePreviewRow();
  const { snapshot, isCurrent } = useVersionSnapshot();

  if (isCurrent || !remove || snapshot.name === undefined) {
    return { available: false };
  }

  return {
    available: true,
    execute: () => {
      return run(
        () => remove(snapshot.id),
        async () => {
          const { list, view } = store.state;
          if (!list.loaded) {
            return;
          }
          const hidden =
            namedOnly &&
            list.snapshots.some(
              (row) => row.id === snapshot.id && row.name === undefined,
            );
          const usesDeletedVersion =
            view.mode !== "live" &&
            (view.compareToId === snapshot.id ||
              (view.mode === "snapshot" && view.snapshotId === snapshot.id));
          if (view.mode === "live" || (hidden && usesDeletedVersion)) {
            await previewRow(list.current);
          }
        },
      );
    },
  };
}

/** The default item; customize its behavior with {@link useDeleteVersionAction}. */
export function DeleteVersionItem(props: DefaultVersionMenuItemProps = {}) {
  const dict = useDictionary();
  const action = useDeleteVersionAction();
  if (!action.available) {
    return null;
  }

  return (
    <VersionMenuItem
      {...props}
      icon={props.icon === undefined ? <RiDeleteBinLine /> : props.icon}
      onClick={() => {
        void action.execute();
      }}
    >
      {props.children === undefined
        ? dict.versioning.delete_menuitem
        : props.children}
    </VersionMenuItem>
  );
}
