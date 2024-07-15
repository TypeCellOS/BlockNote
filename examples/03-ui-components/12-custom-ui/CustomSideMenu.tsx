import { SideMenuProps } from "@blocknote/react";
import { RxDragHandleHorizontal } from "react-icons/rx";

// Custom component to replace the default Block Side Menu.
export function CustomSideMenu(props: SideMenuProps) {
  return (
    <div
      className={"side-menu"}
      draggable="true"
      onDragStart={props.blockDragStart}
      onDragEnd={props.blockDragEnd}>
      <RxDragHandleHorizontal />
    </div>
  );
}
