import { RiArrowGoBackFill } from "react-icons/ri";

import { useDictionary } from "../../../../i18n/dictionary.js";
import { useVersioning } from "../../useVersioning.js";
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
  const { restore, canRestore } = useVersioning();
  const { run, dismiss } = useVersioningSidebar();
  const { snapshot, isCurrent } = useVersionSnapshot();

  if (isCurrent || !canRestore) {
    return { available: false };
  }

  return {
    available: true,
    execute: async () => {
      await run(() => restore(snapshot.id), dismiss);
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
