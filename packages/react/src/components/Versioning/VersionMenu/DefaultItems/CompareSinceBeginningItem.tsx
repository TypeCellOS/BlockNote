import { GoDiff } from "react-icons/go";

import { useDictionary } from "../../../../i18n/dictionary.js";
import { useVersioning, useVersioningState } from "../../useVersioning.js";
import { usePreviewRow } from "../../usePreviewRow.js";
import { useVersioningSidebar } from "../../VersioningSidebarContext.js";
import { useVersionSnapshot } from "../../VersionSnapshotContext.js";
import { getVersionList } from "../../visibleHistory.js";
import type {
  DefaultVersionMenuItemProps,
  VersionMenuAction,
} from "../VersionMenuItem.js";
import { DefaultVersionMenuItem } from "../DefaultVersionMenuItem.js";

/** Compare the menu's own version against the first recorded version. */
export function useCompareSinceBeginningAction(): VersionMenuAction {
  const versioning = useVersioning();
  const list = getVersionList(useVersioningState());
  const start =
    versioning.historyIncludesBeginning && list.loaded
      ? list.snapshots.at(-1)
      : undefined;
  const { setComparisonMode, run } = useVersioningSidebar();
  const { snapshot, selection } = useVersionSnapshot();
  const previewRow = usePreviewRow();

  if (
    !versioning.canCompare ||
    !start ||
    (selection.type === "snapshot" && selection.id === start.id)
  ) {
    return { available: false };
  }

  return {
    available: true,
    execute: async () => {
      await run(async () => {
        setComparisonMode(true);
        return previewRow(snapshot, {
          compareTo: { type: "snapshot", id: start.id },
        });
      });
    },
  };
}

export function CompareSinceBeginningItem(
  props: DefaultVersionMenuItemProps = {},
) {
  const dict = useDictionary();
  const action = useCompareSinceBeginningAction();

  return (
    <DefaultVersionMenuItem
      {...props}
      action={action}
      defaultIcon={<GoDiff />}
      defaultLabel={dict.versioning.compare_since_beginning_menuitem}
    />
  );
}
