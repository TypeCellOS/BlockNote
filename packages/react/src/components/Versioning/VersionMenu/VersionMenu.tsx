import { ReactNode } from "react";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { CompareSinceBeginningItem } from "./DefaultItems/CompareSinceBeginningItem.js";
import { CompareWithVersionItem } from "./DefaultItems/CompareWithVersionItem.js";
import { DeleteVersionItem } from "./DefaultItems/DeleteVersionItem.js";
import { NameVersionItem } from "./DefaultItems/NameVersionItem.js";
import { RestoreVersionItem } from "./DefaultItems/RestoreVersionItem.js";

/**
 * The "..." menu of a version row in the history sidebar.
 *
 * By default it renders the default items. Pass children to override them —
 * the children you pass should be:
 *
 * - Default items: components found within the `/DefaultItems` directory.
 * - Custom items: the `VersionMenuItem` component.
 *
 * Either kind can read the row it's in via `useVersionSnapshot()`, so a custom
 * item ("Make a copy", "Download", …) needs no props:
 *
 * @example
 * ```tsx
 * <VersioningSidebar
 *   snapshotMenu={
 *     <VersionMenu>
 *       <NameVersionItem />
 *       <MakeCopyItem />
 *     </VersionMenu>
 *   }
 * />
 * ```
 */
export function VersionMenu(props: { children?: ReactNode }) {
  const Components = useComponentsContext()!;

  return (
    <Components.Generic.Menu.Dropdown className="bn-menu-dropdown bn-version-menu">
      {props.children ?? (
        <>
          <NameVersionItem />
          <CompareWithVersionItem />
          <CompareSinceBeginningItem />
          <RestoreVersionItem />
          <DeleteVersionItem />
        </>
      )}
    </Components.Generic.Menu.Dropdown>
  );
}
