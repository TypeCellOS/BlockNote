import { RiDeleteBinLine } from "react-icons/ri";

import { useDictionary } from "../../../../i18n/dictionary.js";
import { useVersioning } from "../../useVersioning.js";
import { useVersioningSidebar } from "../../VersioningSidebarContext.js";
import { useVersionSnapshot } from "../../VersionSnapshotContext.js";
import { usePreviewRow } from "../../usePreviewRow.js";
import {
  getPreviousVisibleVersion,
  getShownVersionRow,
  getVersionList,
} from "../../visibleHistory.js";
import type {
  DefaultVersionMenuItemProps,
  VersionMenuAction,
} from "../VersionMenuItem.js";
import { DefaultVersionMenuItem } from "../DefaultVersionMenuItem.js";

/**
 * Delete a named stored version (only its name on continuous-history backends).
 * Reconcile comparison against the remaining visible rows.
 */
export function useDeleteVersionAction(): VersionMenuAction {
  const { remove, canRemove, store } = useVersioning();
  const { run, comparisonMode, namedOnly } = useVersioningSidebar();
  const previewRow = usePreviewRow();
  const { snapshot, isCurrent } = useVersionSnapshot();

  if (isCurrent || !canRemove || snapshot.name === undefined) {
    return { available: false };
  }

  return {
    available: true,
    execute: async () => {
      const before = store.state;
      const wasBaseline =
        comparisonMode &&
        before.mode === "versions" &&
        before.compareTo === snapshot.id;
      await run(
        () => remove(snapshot.id),
        async () => {
          if (!wasBaseline) {
            return;
          }
          const state = store.state;
          const list = getVersionList(state);
          if (state.mode !== "versions" || !list.loaded) {
            return;
          }
          const shown = getShownVersionRow(list, state);
          if (
            shown &&
            state.compareTo !==
              getPreviousVisibleVersion(list, shown.snapshot, namedOnly)?.id
          ) {
            return previewRow(shown.snapshot);
          }
          return undefined;
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
