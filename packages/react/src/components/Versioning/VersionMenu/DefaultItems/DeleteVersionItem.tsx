import { VersioningExtension } from "@blocknote/core/extensions";
import { RiDeleteBinLine } from "react-icons/ri";

import { useDictionary } from "../../../../i18n/dictionary.js";
import { useExtension } from "../../../../hooks/useExtension.js";
import { usePreviewRow } from "../../usePreviewRow.js";
import { useVersioningSidebar } from "../../VersioningSidebarContext.js";
import { useVersionSnapshot } from "../../VersionSnapshotContext.js";
import { VersionMenuItem } from "../VersionMenuItem.js";

/**
 * "Delete" — removes a *named* stored version.
 *
 * Only named stored rows can be deleted: an automatic version is a point in the
 * document's history, not something a user created, so there's nothing to
 * delete. On backends with continuous history, deleting only drops the name and
 * the row stays as an automatic version.
 *
 * If the deleted version was the one on screen (or its diff baseline), the
 * sidebar re-selects the current version: the panel always has a selection,
 * and the editor stays read-only for as long as it's open.
 */
export function DeleteVersionItem() {
  const dict = useDictionary();
  const { remove, store } = useExtension(VersioningExtension);
  const { run } = useVersioningSidebar();
  const previewRow = usePreviewRow();
  const { snapshot, isCurrent } = useVersionSnapshot();

  if (isCurrent || !remove || snapshot.name === undefined) {
    return null;
  }

  return (
    <VersionMenuItem
      icon={<RiDeleteBinLine />}
      onClick={() => {
        void run(
          () => remove(snapshot.id),
          async () => {
            const { list, view } = store.state;
            if (view.mode === "live" && list.loaded) {
              await previewRow(list.current);
            }
          },
        );
      }}
    >
      {dict.versioning.delete_menuitem}
    </VersionMenuItem>
  );
}
