import { VersioningExtension } from "@blocknote/core/extensions";
import { GoDiff } from "react-icons/go";

import { useDictionary } from "../../../../i18n/dictionary.js";
import { useExtension } from "../../../../hooks/useExtension.js";
import { usePreviewRow } from "../../usePreviewRow.js";
import { useVersioningSidebar } from "../../VersioningSidebarContext.js";
import { useVersionSnapshot } from "../../VersionSnapshotContext.js";
import { VersionMenuItem } from "../VersionMenuItem.js";

/**
 * "Compare with this version" — moves the diff baseline to this row, keeping
 * whatever is currently being shown (the current version when nothing, or this
 * same version, was being shown).
 *
 * Hidden on the current row (a version is never diffed against itself) and when
 * the backend can't diff at all.
 */
export function CompareWithVersionItem() {
  const dict = useDictionary();
  const { store, getSnapshot, canCompare } = useExtension(VersioningExtension);
  const { setComparisonMode, run } = useVersioningSidebar();
  const previewRow = usePreviewRow();
  const { snapshot, isCurrent } = useVersionSnapshot();

  if (isCurrent || !canCompare) {
    return null;
  }

  return (
    <VersionMenuItem
      icon={<GoDiff />}
      onClick={() => {
        setComparisonMode(true);

        const { view, list } = store.state;
        if (!list.loaded) {
          return;
        }
        const shown =
          view.mode === "snapshot" && view.snapshotId !== snapshot.id
            ? getSnapshot(view.snapshotId)
            : undefined;
        void run(() =>
          previewRow(shown ?? list.current, {
            compareTo: { type: "snapshot", id: snapshot.id },
          }),
        );
      }}
    >
      {dict.versioning.compare_with_menuitem}
    </VersionMenuItem>
  );
}
