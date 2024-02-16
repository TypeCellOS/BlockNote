import { SideMenuController } from "@blocknote/react";
import { RxDragHandleHorizontal } from "react-icons/rx";

export function CustomSideMenu() {
  return (
    <SideMenuController
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
}
