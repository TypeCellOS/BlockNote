import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { MdDragIndicator } from "react-icons/md";

import { useComponentsContext } from "../../../../editor/ComponentsContext";
import { DragHandleMenu } from "../../DragHandleMenu/mantine/DragHandleMenu";
import { SideMenuProps } from "../../SideMenuProps";
import { SideMenuButton } from "../SideMenuButton";

export const DragHandleButton = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: Omit<SideMenuProps<BSchema, I, S>, "addBlock">
) => {
  const components = useComponentsContext()!;
  const Component = props.dragHandleMenu || DragHandleMenu;

  return (
    <components.Menu
      withinPortal={false}
      trigger={"click"}
      setOpen={(open: boolean) => {
        if (open) {
          props.freezeMenu();
        } else {
          props.unfreezeMenu();
        }
      }}
      // onOpen={props.freezeMenu}
      // onClose={props.unfreezeMenu}
      width={100}
      position={"left"}>
      <components.MenuTarget>
        <div
          className={"bn-drag-handle"}
          draggable="true"
          onDragStart={props.blockDragStart}
          onDragEnd={props.blockDragEnd}>
          <SideMenuButton>
            <MdDragIndicator size={24} data-test={"dragHandle"} />
          </SideMenuButton>
        </div>
      </components.MenuTarget>
      <Component block={props.block} />
    </components.Menu>
  );
};
