import { useEffect, useRef } from "react";
import { ActionIcon, Group, Menu } from "@mantine/core";
import { AiOutlinePlus } from "react-icons/ai";
import { MdDragIndicator } from "react-icons/md";
import {
  BaseUiElementCallbacks,
  BaseUiElementState,
  BlockNoteEditor,
  BlockSchema,
  SideMenuCallbacks,
  SideMenuState,
} from "@blocknote/core";

import { DefaultDragHandleMenu } from "./DragHandleMenu/DefaultDragHandleMenu";

export const DefaultSideMenu = <BSchema extends BlockSchema>(
  props: Omit<SideMenuCallbacks, keyof BaseUiElementCallbacks> &
    Omit<SideMenuState<BSchema>, keyof BaseUiElementState> & {
      editor: BlockNoteEditor<BSchema>;
    }
) => {
  const dragHandleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dragHandle = dragHandleRef.current;

    if (dragHandle instanceof HTMLDivElement) {
      dragHandle.addEventListener("dragstart", props.blockDragStart);
      dragHandle.addEventListener("dragend", props.blockDragEnd);

      return () => {
        dragHandle.removeEventListener("dragstart", props.blockDragStart);
        dragHandle.removeEventListener("dragend", props.blockDragEnd);
      };
    }

    return;
  }, [props.blockDragEnd, props.blockDragStart]);

  const DragHandleMenu = DefaultDragHandleMenu;

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
          <div draggable="true" ref={dragHandleRef}>
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
