import {
  DragHandle,
  SideMenu,
  SideMenuButton,
  SideMenuProps,
} from "@blocknote/react";
import "@blocknote/react/style.css";
import { MdDelete } from "react-icons/md";

export const CustomSideMenu = (props: SideMenuProps) => (
  <SideMenu>
    <SideMenuButton>
      <MdDelete
        size={24}
        onClick={() => props.editor.removeBlocks([props.block])}
      />
    </SideMenuButton>
    <DragHandle {...props} />
  </SideMenu>
);
