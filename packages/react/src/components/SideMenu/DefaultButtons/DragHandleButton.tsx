import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { MdDragIndicator } from "react-icons/md";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { DragHandleMenu } from "../DragHandleMenu/DragHandleMenu";
import { SideMenuProps } from "../SideMenuProps";

export const DragHandleButton = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: Omit<SideMenuProps<BSchema, I, S>, "addBlock">
) => {
  const Components = useComponentsContext()!;

  const Component = props.dragHandleMenu || DragHandleMenu;

  return (
    <Components.Generic.Menu.Root
      onOpenChange={(open: boolean) => {
        if (open) {
          props.freezeMenu();
        } else {
          props.unfreezeMenu();
        }
      }}
      position={"left"}>
      <Components.Generic.Menu.Trigger>
        <div
          className="bn-drag-handle"
          draggable="true"
          onDragStart={props.blockDragStart}
          onDragEnd={props.blockDragEnd}>
          <Components.SideMenu.Button
            className={"bn-button"}
            icon={<MdDragIndicator size={24} data-test="dragHandle" />}
          />
        </div>
      </Components.Generic.Menu.Trigger>
      <Component block={props.block} />
    </Components.Generic.Menu.Root>
  );
};
