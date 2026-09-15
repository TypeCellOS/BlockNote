import { VersioningExtension } from "@blocknote/core/extensions";
import { RiArrowGoBackFill } from "react-icons/ri";

import { useDictionary } from "../../../../i18n/dictionary.js";
import { useExtension } from "../../../../hooks/useExtension.js";
import { usePreviewRow } from "../../usePreviewRow.js";
import { useVersioningSidebar } from "../../VersioningSidebarContext.js";
import { useVersionSnapshot } from "../../VersionSnapshotContext.js";
import { VersionMenuItem } from "../VersionMenuItem.js";

/**
 * "Restore" — rolls the document back to this version. Only on stored rows;
 * restoring the current version would be a no-op.
 *
 * Afterwards the sidebar re-selects the current row, so the user sees the
 * restored document as the new head rather than being left in a stale preview.
 */
export function RestoreVersionItem() {
  const dict = useDictionary();
  const { restore, store } = useExtension(VersioningExtension);
  const { run } = useVersioningSidebar();
  const previewRow = usePreviewRow();
  const { snapshot, isCurrent } = useVersionSnapshot();

  if (isCurrent || !restore) {
    return null;
  }

  return (
    <VersionMenuItem
      icon={<RiArrowGoBackFill />}
      onClick={() => {
        void run(
          () => restore(snapshot.id),
          async () => {
            const { list } = store.state;
            if (list.loaded) {
              await previewRow(list.current);
            }
          },
        );
      }}
    >
      {dict.versioning.restore_menuitem}
    </VersionMenuItem>
  );
}
