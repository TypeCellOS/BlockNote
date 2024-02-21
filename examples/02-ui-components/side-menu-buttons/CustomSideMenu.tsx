import { DragHandle, SideMenuProps, SideMenuWrapper } from "@blocknote/react";
import "@blocknote/react/style.css";

import { CustomButton } from "./CustomButton";

export function CustomSideMenu(props: SideMenuProps) {
  return (
    <SideMenuWrapper>
      <CustomButton {...props} />
      <DragHandle {...props} />
    </SideMenuWrapper>
  );
}
