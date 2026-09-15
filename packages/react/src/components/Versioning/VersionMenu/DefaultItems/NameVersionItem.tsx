import { VersioningExtension } from "@blocknote/core/extensions";
import { RiPriceTag3Line } from "react-icons/ri";

import { useDictionary } from "../../../../i18n/dictionary.js";
import { useExtension } from "../../../../hooks/useExtension.js";
import { useVersionSnapshot } from "../../VersionSnapshotContext.js";
import {
  VersionMenuItem,
  type DefaultVersionMenuItemProps,
  type VersionMenuAction,
} from "../VersionMenuItem.js";

/**
 * "Name this version" / "Rename" — starts the row's inline rename. Which verb
 * commits it is the row's business: naming an unnamed current version calls
 * `create`, everything else calls `rename`.
 *
 * Hidden when the backend supports neither.
 */
export function useNameVersionAction(): VersionMenuAction {
  const { create, rename } = useExtension(VersioningExtension);
  const { snapshot, isCurrent, startRename } = useVersionSnapshot();

  const named = snapshot.name !== undefined;
  // An unnamed current row is *created* as a named version; every other row
  // (and a current row that already has a name) is renamed.
  const available = isCurrent && !named ? create : rename;
  if (!available) {
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
  if (!action.available) {
    return null;
  }

  return (
    <VersionMenuItem
      {...props}
      icon={props.icon === undefined ? <RiPriceTag3Line /> : props.icon}
      onClick={() => {
        void action.execute();
      }}
    >
      {props.children === undefined
        ? named
          ? dict.versioning.rename_menuitem
          : dict.versioning.name_version_menuitem
        : props.children}
    </VersionMenuItem>
  );
}
