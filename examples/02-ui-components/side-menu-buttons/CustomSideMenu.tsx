import { DragHandle, SideMenu, SideMenuProps } from "@blocknote/react";
import "@blocknote/react/style.css";

import { RemoveBlockButton } from "./RemoveBlockButton";

export function CustomSideMenu(props: SideMenuProps) {
  return (
    <SideMenu {...props}>
      <RemoveBlockButton {...props} />
      <DragHandle {...props} />
    </SideMenu>
  );
}
