import { BlockSchema } from "@blocknote/core";

import { SideMenuProps } from "./SideMenuPositioner";
import { SideMenu } from "./SideMenu";
import { AddBlockButton } from "./DefaultButtons/AddBlockButton";
import { DragHandle } from "./DefaultButtons/DragHandle";

export const DefaultSideMenu = <BSchema extends BlockSchema>(
  props: SideMenuProps<BSchema>
) => (
  <SideMenu>
    <AddBlockButton {...props} />
    <DragHandle {...props} />
  </SideMenu>
);
