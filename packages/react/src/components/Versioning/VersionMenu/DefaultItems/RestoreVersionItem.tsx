import { VersioningExtension } from "@blocknote/core/extensions";
import { RiArrowGoBackFill } from "react-icons/ri";

import { useDictionary } from "../../../../i18n/dictionary.js";
import { useExtension } from "../../../../hooks/useExtension.js";
import { usePreviewRow } from "../../usePreviewRow.js";
import { useVersioningSidebar } from "../../VersioningSidebarContext.js";
import { useVersionSnapshot } from "../../VersionSnapshotContext.js";
import {
  VersionMenuItem,
  type DefaultVersionMenuItemProps,
  type VersionMenuAction,
} from "../VersionMenuItem.js";

/**
 * "Restore" — rolls the document back to this version. Only on stored rows;
 * restoring the current version would be a no-op.
 *
 * Afterwards the sidebar re-selects the current row, so the user sees the
 * restored document as the new head rather than being left in a stale preview.
 *
 * Check `action.available` before calling `action.execute()`. Custom items can
 * request confirmation first, then execute the same restore and preview flow.
 * The hook must be called inside a snapshot row (for example, in `snapshotMenu`).
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
  if (!action.available) {
    return null;
  }

  return (
    <VersionMenuItem
      {...props}
      icon={props.icon === undefined ? <RiArrowGoBackFill /> : props.icon}
      onClick={() => {
        void action.execute();
      }}
    >
      {props.children === undefined
        ? dict.versioning.restore_menuitem
        : props.children}
    </VersionMenuItem>
  );
}
