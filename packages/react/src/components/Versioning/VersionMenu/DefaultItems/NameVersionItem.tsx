import { RiPriceTag3Line } from "react-icons/ri";

import { useDictionary } from "../../../../i18n/dictionary.js";
import { useVersioning } from "../../useVersioning.js";
import { useVersionSnapshot } from "../../VersionSnapshotContext.js";
import type {
  DefaultVersionMenuItemProps,
  VersionMenuAction,
} from "../VersionMenuItem.js";
import { DefaultVersionMenuItem } from "../DefaultVersionMenuItem.js";

/** Start inline naming: create an unnamed current version, otherwise rename. */
export function useNameVersionAction(): VersionMenuAction {
  const { canCreate, canRename } = useVersioning();
  const { selection, isStart, startRename } = useVersionSnapshot();

  const available = selection.type === "current" ? canCreate : canRename;
  if (!available || isStart) {
    return { available: false };
  }

  return { available: true, execute: startRename };
}

/** The default item; customize its behavior with {@link useNameVersionAction}. */
export function NameVersionItem(props: DefaultVersionMenuItemProps = {}) {
  const dict = useDictionary();
  const action = useNameVersionAction();
  const { snapshot } = useVersionSnapshot();
  const named = snapshot.name !== undefined;

  return (
    <DefaultVersionMenuItem
      {...props}
      action={action}
      defaultIcon={<RiPriceTag3Line />}
      defaultLabel={
        named
          ? dict.versioning.rename_menuitem
          : dict.versioning.name_version_menuitem
      }
    />
  );
}
