import { VersioningExtension } from "@blocknote/core/extensions";
import { RiDeleteBinLine } from "react-icons/ri";

import { useDictionary } from "../../../../i18n/dictionary.js";
import { useExtension } from "../../../../hooks/useExtension.js";
import { usePreviewRow } from "../../usePreviewRow.js";
import { useVersioningSidebar } from "../../VersioningSidebarContext.js";
import { useVersionSnapshot } from "../../VersionSnapshotContext.js";
import {
  getVisibleVersionRows,
  viewReferencesVersion,
} from "../../visibleHistory.js";
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
          const visible = getVisibleVersionRows(list, namedOnly).some(
            (row) => row.snapshot.id === snapshot.id,
          );
          const usesDeletedVersion = viewReferencesVersion(view, snapshot.id);
          if (view.mode === "live" || (!visible && usesDeletedVersion)) {
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
