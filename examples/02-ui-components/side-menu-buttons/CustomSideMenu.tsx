import {
  DragHandle,
  SideMenu,
  SideMenuProps,
} from "@blocknote/react";
import "@blocknote/react/style.css";

import { CustomButton } from "./CustomButton";

export function CustomSideMenu(props: SideMenuProps) {
  return (
    <SideMenu {...props}>
      <CustomButton {...props} />
      <DragHandle {...props} />
    </SideMenu>
  );
}
