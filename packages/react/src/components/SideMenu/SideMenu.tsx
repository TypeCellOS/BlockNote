import { ReactNode } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { AddBlockButton } from "./DefaultButtons/AddBlockButton.js";
import { DragHandleButton } from "./DefaultButtons/DragHandleButton.js";
import { SideMenuProps } from "./SideMenuProps.js";

// TODO: props.dragHandleMenu should only be available if no children are passed
/**
 * By default, the SideMenu component will render with default buttons. However,
 * you can override the buttons to render by passing children. The children you
 * pass should be:
 *
 * - Default buttons: Components found within the `/DefaultButtons` directory.
 * - Custom buttons: The `SideMenuButton` component.
 */
export const SideMenu = (props: SideMenuProps & { children?: ReactNode }) => {
  const Components = useComponentsContext()!;

  return (
    <Components.SideMenu.Root className={"bn-side-menu"}>
      {props.children || (
        <>
          <AddBlockButton />
          <DragHandleButton dragHandleMenu={props.dragHandleMenu} />
        </>
      )}
    </Components.SideMenu.Root>
  );
};
