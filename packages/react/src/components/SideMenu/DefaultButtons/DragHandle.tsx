import {
  Block,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { Menu } from "@mantine/core";
import { MdDragIndicator } from "react-icons/md";
import { DefaultDragHandleMenu } from "../DragHandleMenu/DefaultDragHandleMenu";
import { SideMenuButton } from "../SideMenuButton";
import { FC } from "react";
import type { DragHandleMenuProps } from "../DragHandleMenu/DragHandleMenu";

export const DragHandle = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  block: Block<BSchema, I, S>;
  blockDragStart: (event: {
    dataTransfer: DataTransfer | null;
    clientY: number;
  }) => void;
  blockDragEnd: () => void;
  freezeMenu: () => void;
  unfreezeMenu: () => void;
  dragHandleMenu?: FC<DragHandleMenuProps<BSchema, I, S>>;
}) => {
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
      <DragHandleMenu block={props.block} />
    </Menu>
  );
};
