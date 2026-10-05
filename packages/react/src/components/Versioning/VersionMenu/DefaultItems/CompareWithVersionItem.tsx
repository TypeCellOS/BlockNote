import { GoDiff } from "react-icons/go";

import { useDictionary } from "../../../../i18n/dictionary.js";
import { useVersioning } from "../../useVersioning.js";
import { usePreviewRow } from "../../usePreviewRow.js";
import { useVersioningSidebar } from "../../VersioningSidebarContext.js";
import { useVersionSnapshot } from "../../VersionSnapshotContext.js";
import { getShownVersionRow, getVersionList } from "../../visibleHistory.js";
import type {
  DefaultVersionMenuItemProps,
  VersionMenuAction,
} from "../VersionMenuItem.js";
import { DefaultVersionMenuItem } from "../DefaultVersionMenuItem.js";

/**
 * Compare this stored row with the shown version, always previewing the newer
 * one against the older one. Falls back to current when nothing is shown.
 */
export function useCompareWithVersionAction(): VersionMenuAction {
  const { store, canCompare } = useVersioning();
  const { setComparisonMode, run } = useVersioningSidebar();
  const previewRow = usePreviewRow();
  const { snapshot, isCurrent } = useVersionSnapshot();

  const view = store.state;
  const isShown =
    view.mode === "versions" &&
    view.displayed.type === "snapshot" &&
    view.displayed.id === snapshot.id;

  if (isCurrent || isShown || !canCompare) {
    return { available: false };
  }

  return {
    available: true,
    execute: () => {
      setComparisonMode(true);

      const view = store.state;
      const list = getVersionList(view);
      if (!list.loaded) {
        return;
      }
      const shown = getShownVersionRow(list, view);
      const other =
        shown && shown.snapshot.id !== snapshot.id
          ? shown.snapshot
          : list.current;
      const target =
        other.id === list.current.id || other.createdAt >= snapshot.createdAt
          ? other
          : snapshot;
      const baseline = target === snapshot ? other : snapshot;
      return run(() =>
        previewRow(target, {
          compareTo: { type: "snapshot", id: baseline.id },
        }),
      );
    },
  };
}

/** The default item; customize its behavior with {@link useCompareWithVersionAction}. */
export function CompareWithVersionItem(
  props: DefaultVersionMenuItemProps = {},
) {
  const dict = useDictionary();
  const action = useCompareWithVersionAction();

  return (
    <DefaultVersionMenuItem
      {...props}
      action={action}
      defaultIcon={<GoDiff />}
      defaultLabel={dict.versioning.compare_with_menuitem}
    />
  );
}
