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
 * By default it renders the default items. Include `DefaultVersionMenuItems`
 * among your children to keep all defaults and append or prepend custom items.
 * Pass children to override the defaults —
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
      {props.children === undefined ? (
        <DefaultVersionMenuItems />
      ) : (
        props.children
      )}
    </Components.Generic.Menu.Dropdown>
  );
}

/** The default actions as a fragment, for composing defaults plus custom items. */
export function DefaultVersionMenuItems() {
  return (
    <>
      <NameVersionItem />
      <CompareWithVersionItem />
      <CompareSinceBeginningItem />
      <RestoreVersionItem />
      <DeleteVersionItem />
    </>
  );
}
