import { VersioningExtension } from "@blocknote/core/extensions";
import { RiDeleteBinLine } from "react-icons/ri";

import { useDictionary } from "../../../../i18n/dictionary.js";
import { useExtension } from "../../../../hooks/useExtension.js";
import { usePreviewRow } from "../../usePreviewRow.js";
import { useVersioningSidebar } from "../../VersioningSidebarContext.js";
import { useVersionSnapshot } from "../../VersionSnapshotContext.js";
import type {
  DefaultVersionMenuItemProps,
  VersionMenuAction,
} from "../VersionMenuItem.js";
import { DefaultVersionMenuItem } from "../DefaultVersionMenuItem.js";

/**
 * Delete a named stored version (only its name on continuous-history backends).
 * Return to current if the shown version or baseline is removed or filtered out.
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
          const deleted = !list.snapshots.some((row) => row.id === snapshot.id);
          const usesDeletedVersion =
            view.mode !== "live" &&
            (view.compareToId === snapshot.id ||
              (view.mode === "snapshot" && view.snapshotId === snapshot.id));
          if (
            view.mode === "live" ||
            ((hidden || deleted) && usesDeletedVersion)
          ) {
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

  return (
    <DefaultVersionMenuItem
      {...props}
      action={action}
      defaultIcon={<RiDeleteBinLine />}
      defaultLabel={dict.versioning.delete_menuitem}
    />
  );
}
