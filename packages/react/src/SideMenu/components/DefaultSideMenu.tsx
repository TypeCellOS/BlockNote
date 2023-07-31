import { FC } from "react";
import { ActionIcon, Group, Menu } from "@mantine/core";
import { AiOutlinePlus } from "react-icons/ai";
import { MdDragIndicator } from "react-icons/md";
import { BlockSchema } from "@blocknote/core";

import { SideMenuProps } from "./SideMenuPositioner";
import { DragHandleMenuProps } from "./DragHandleMenu/DragHandleMenu";
import { DefaultDragHandleMenu } from "./DragHandleMenu/DefaultDragHandleMenu";

export const DefaultSideMenu = <BSchema extends BlockSchema>(
  props: SideMenuProps<BSchema> & {
    dragHandleMenu?: FC<DragHandleMenuProps<BSchema>>;
  }
) => {
  const DragHandleMenu = props.dragHandleMenu || DefaultDragHandleMenu;

  return (
    <Group spacing={0}>
      <ActionIcon size={24} data-test={"dragHandleAdd"}>
        <AiOutlinePlus size={24} onClick={props.addBlock} />
      </ActionIcon>
      <Menu
        trigger={"click"}
        onOpen={props.freezeMenu}
        onClose={props.unfreezeMenu}
        width={100}
        position={"left"}>
        <Menu.Target>
          <div
            draggable="true"
            onDragStart={props.blockDragStart}
            onDragEnd={props.blockDragEnd}>
            <ActionIcon size={24} data-test={"dragHandle"}>
              {<MdDragIndicator size={24} />}
            </ActionIcon>
          </div>
        </Menu.Target>
        <DragHandleMenu editor={props.editor} block={props.block} />
      </Menu>
    </Group>
  );
};
