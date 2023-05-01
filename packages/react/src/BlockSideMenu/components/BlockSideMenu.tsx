import { FC, useEffect, useRef, useState } from "react";
import { ActionIcon, Group, Menu } from "@mantine/core";
import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { AiOutlinePlus, MdDragIndicator } from "react-icons/all";
import { DragHandleMenu } from "./DragHandleMenu";
import { RemoveBlockButton } from "./DefaultButtons/RemoveBlockButton";
import { BlockColorsButton } from "./DefaultButtons/BlockColorsButton";

export type BlockSideMenuProps<BSchema extends BlockSchema> = {
  editor: BlockNoteEditor<BSchema>;
  dragHandleMenu?: FC<{
    editor: BlockNoteEditor<BSchema>;
    closeMenu: () => void;
  }>;
  addBlock: () => void;
  blockDragStart: (event: DragEvent) => void;
  blockDragEnd: () => void;
  freezeMenu: () => void;
  unfreezeMenu: () => void;
};

export const BlockSideMenu = <BSchema extends BlockSchema>(
  props: BlockSideMenuProps<BSchema>
) => {
  const [dragHandleMenuOpened, setDragHandleMenuOpened] = useState(false);

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

  const closeMenu = () => {
    setDragHandleMenuOpened(false);
    props.unfreezeMenu();
  };

  const CustomDragHandleMenu = props.dragHandleMenu;

  return (
    <Group spacing={0}>
      <ActionIcon size={24} color={"brandFinal.3"} data-test={"dragHandleAdd"}>
        {
          <AiOutlinePlus
            size={24}
            onClick={() => {
              props.addBlock();
            }}
          />
        }
      </ActionIcon>
      <Menu opened={dragHandleMenuOpened} width={100} position={"left"}>
        <Menu.Target>
          <div draggable="true" ref={dragHandleRef}>
            <ActionIcon
              onClick={() => {
                setDragHandleMenuOpened(true);
                props.freezeMenu();
              }}
              size={24}
              color={"brandFinal.3"}
              data-test={"dragHandle"}>
              {<MdDragIndicator size={24} />}
            </ActionIcon>
          </div>
        </Menu.Target>
        {CustomDragHandleMenu ? (
          <CustomDragHandleMenu
            editor={props.editor}
            closeMenu={() => {
              setDragHandleMenuOpened(false);
              props.unfreezeMenu();
            }}
          />
        ) : (
          <DragHandleMenu>
            <RemoveBlockButton editor={props.editor} closeMenu={closeMenu}>
              Delete
            </RemoveBlockButton>
            <BlockColorsButton editor={props.editor} closeMenu={closeMenu}>
              Colors
            </BlockColorsButton>
          </DragHandleMenu>
        )}
      </Menu>
    </Group>
  );
};
