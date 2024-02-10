import { BlockNoteEditor } from "@blocknote/core";
import { SideMenuPositioner } from "@blocknote/react";
import { RxDragHandleHorizontal } from "react-icons/rx";

export const CustomSideMenu = (props: { editor: BlockNoteEditor }) => (
  <SideMenuPositioner
    editor={props.editor}
    sideMenu={(props) => (
      // Side menu consists of only a drag handle
      <div
        className={"side-menu"}
        draggable="true"
        onDragStart={props.blockDragStart}
        onDragEnd={props.blockDragEnd}>
        <RxDragHandleHorizontal />
      </div>
    )}
  />
);
