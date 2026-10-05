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
    execute: () => {
      const before = store.state;
      return run(
        () => remove(snapshot.id),
        async (result) => {
          if (result.status !== "done" || before.mode !== "versions") {
            return;
          }
          const state = store.state;
          const list = getVersionList(state);
          if (!list.loaded || state.mode !== "versions") {
            return;
          }
          const shown = getShownVersionRow(list, state);
          if (!shown) {
            return;
          }
          if (
            comparisonMode &&
            before.compareTo === snapshot.id &&
            state.compareTo !==
              getPreviousVisibleVersion(list, shown.snapshot, namedOnly)?.id
          ) {
            await previewRow(shown.snapshot);
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
