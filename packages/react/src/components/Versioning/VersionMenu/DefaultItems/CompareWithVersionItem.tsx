import { VersioningExtension } from "@blocknote/core/extensions";
import { GoDiff } from "react-icons/go";

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
 * Use this stored row as the baseline, keeping the shown version.
 * Falls back to current when nothing or this same row was shown.
 */
export function useCompareWithVersionAction(): VersionMenuAction {
  const versioning = useExtension(VersioningExtension);
  const { store, canCompare } = versioning;
  const { setComparisonMode, run } = useVersioningSidebar();
  const previewRow = usePreviewRow();
  const { snapshot, isCurrent } = useVersionSnapshot();

  if (isCurrent || !canCompare) {
    return { available: false };
  }

  return {
    available: true,
    execute: () => {
      setComparisonMode(true);

      const { view, list } = store.state;
      if (!list.loaded) {
        return;
      }
      const shown =
        view.mode === "snapshot" && view.snapshotId !== snapshot.id
          ? versioning.getSnapshot(view.snapshotId)
          : undefined;
      return run(() =>
        previewRow(shown ?? list.current, {
          compareTo: { type: "snapshot", id: snapshot.id },
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
