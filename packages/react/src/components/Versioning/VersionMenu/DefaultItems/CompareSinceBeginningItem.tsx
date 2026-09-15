import { VersioningExtension } from "@blocknote/core/extensions";
import { GoHistory } from "react-icons/go";

import { useDictionary } from "../../../../i18n/dictionary.js";
import {
  useExtension,
  useExtensionState,
} from "../../../../hooks/useExtension.js";
import { usePreviewRow } from "../../usePreviewRow.js";
import { useVersioningSidebar } from "../../VersioningSidebarContext.js";
import { useVersionSnapshot } from "../../VersionSnapshotContext.js";
import { VersionMenuItem } from "../VersionMenuItem.js";

/**
 * "Compare since beginning" — diffs the current version against the oldest
 * version in the list, i.e. shows everything that ever changed.
 *
 * Only on the current row, and only when there's an older version to diff
 * against.
 */
export function CompareSinceBeginningItem() {
  const dict = useDictionary();
  const { canCompare } = useExtension(VersioningExtension);
  const { setComparisonMode, run } = useVersioningSidebar();
  const previewRow = usePreviewRow();
  const { isCurrent } = useVersionSnapshot();

  const list = useExtensionState(VersioningExtension, {
    selector: (state) => state.list,
  });
  const oldest = list.loaded
    ? list.snapshots[list.snapshots.length - 1]
    : undefined;

  if (!isCurrent || !canCompare || !oldest) {
    return null;
  }

  return (
    <VersionMenuItem
      icon={<GoHistory />}
      onClick={() => {
        setComparisonMode(true);
        if (list.loaded) {
          void run(() =>
            previewRow(list.current, {
              compareTo: { type: "snapshot", id: oldest.id },
            }),
          );
        }
      }}
    >
      {dict.versioning.compare_since_beginning_menuitem}
    </VersionMenuItem>
  );
}
