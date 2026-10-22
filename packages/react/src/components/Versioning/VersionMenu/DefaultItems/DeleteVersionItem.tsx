import { RiDeleteBinLine } from "react-icons/ri";

import { useDictionary } from "../../../../i18n/dictionary.js";
import { useVersioning } from "../../useVersioning.js";
import { useVersioningSidebar } from "../../VersioningSidebarContext.js";
import { useVersionSnapshot } from "../../VersionSnapshotContext.js";
import { useReconcileComparison } from "../../useReconcileComparison.js";
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
  const { run } = useVersioningSidebar();
  const reconcileComparison = useReconcileComparison();
  const { snapshot, isCurrent } = useVersionSnapshot();

  if (isCurrent || !canRemove || snapshot.name === undefined) {
    return { available: false };
  }

  return {
    available: true,
    execute: async () => {
      const before = store.state;
      await run(
        () => remove(snapshot.id),
        () => reconcileComparison(before, snapshot.id),
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
