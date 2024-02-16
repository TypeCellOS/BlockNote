import {
  DragHandle,
  SideMenu,
  SideMenuButton,
  SideMenuProps,
} from "@blocknote/react";
import "@blocknote/react/style.css";
import { MdDelete } from "react-icons/md";
import { BlockNoteEditor } from "@blocknote/core";

export const CustomSideMenu = (
  props: { editor: BlockNoteEditor } & SideMenuProps
) => (
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
