import { VersioningExtension } from "@blocknote/core/extensions";
import { RiArrowGoBackFill } from "react-icons/ri";

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
 * Restore this stored version and reselect current.
 * Call inside a snapshot row; check `available` before `execute`. Custom items
 * can request confirmation before executing the same restore/preview flow.
 */
export function useRestoreVersionAction(): VersionMenuAction {
  const { restore, store } = useExtension(VersioningExtension);
  const { run } = useVersioningSidebar();
  const previewRow = usePreviewRow();
  const { snapshot, isCurrent } = useVersionSnapshot();

  if (isCurrent || !restore) {
    return { available: false };
  }

  return {
    available: true,
    execute: () => {
      return run(
        () => restore(snapshot.id),
        async () => {
          const { list } = store.state;
          if (list.loaded) {
            await previewRow(list.current);
          }
        },
      );
    },
  };
}

/** The default item; customize its behavior with {@link useRestoreVersionAction}. */
export function RestoreVersionItem(props: DefaultVersionMenuItemProps = {}) {
  const dict = useDictionary();
  const action = useRestoreVersionAction();

  return (
    <DefaultVersionMenuItem
      {...props}
      action={action}
      defaultIcon={<RiArrowGoBackFill />}
      defaultLabel={dict.versioning.restore_menuitem}
    />
  );
}
