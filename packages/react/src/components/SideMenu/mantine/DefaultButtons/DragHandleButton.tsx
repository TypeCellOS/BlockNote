import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { Menu } from "@mantine/core";
import { MdDragIndicator } from "react-icons/md";

import { SideMenuProps } from "../../SideMenuProps";
import { SideMenuButton } from "../SideMenuButton";
import { DragHandleMenu } from "../../DragHandleMenu/mantine/DragHandleMenu";

export const DragHandleButton = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: Omit<SideMenuProps<BSchema, I, S>, "addBlock">
) => {
  const Component = props.dragHandleMenu || DragHandleMenu;

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
      <Component block={props.block} />
    </Menu>
  );
};
