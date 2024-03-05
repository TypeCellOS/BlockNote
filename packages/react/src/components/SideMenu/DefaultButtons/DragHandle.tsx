import { BlockSchema } from "@blocknote/core";
import { Menu } from "@mantine/core";
import { MdDragIndicator } from "react-icons/md";
import { DefaultDragHandleMenu } from "../DragHandleMenu/DefaultDragHandleMenu";
import { SideMenuButton } from "../SideMenuButton";
import type { SideMenuProps } from "../SideMenuPositioner";

export const DragHandle = <BSchema extends BlockSchema>(
  props: SideMenuProps<BSchema, any, any>
) => {
  const DragHandleMenu = props.dragHandleMenu || DefaultDragHandleMenu;

  return (
    <Menu
      withinPortal={false}
      trigger={"click"}
      onOpen={props.freezeMenu}
      onClose={props.unfreezeMenu}
      width={100}
      position={"left"}>
      <Menu.Target>
        <div
          className={"bn-drag-handle"}
          draggable="true"
          onDragStart={props.blockDragStart}
          onDragEnd={props.blockDragEnd}>
          <SideMenuButton>
            <MdDragIndicator size={24} data-test={"dragHandle"} />
          </SideMenuButton>
        </div>
      </Menu.Target>
      <DragHandleMenu editor={props.editor} block={props.block} />
    </Menu>
  );
};
