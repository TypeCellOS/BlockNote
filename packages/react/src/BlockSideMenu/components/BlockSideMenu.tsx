import { Block, BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { ActionIcon, Group, Menu } from "@mantine/core";
import { FC, useEffect, useRef, useState } from "react";
import { AiOutlinePlus } from "react-icons/ai";
import { MdDragIndicator } from "react-icons/md";
import { DefaultDragHandleMenu } from "./DefaultDragHandleMenu";
import { DragHandleMenuProps } from "./DragHandleMenu";

export type BlockSideMenuProps<BSchema extends BlockSchema> = {
  editor: BlockNoteEditor<BSchema>;
  block: Block<BSchema>;
  dragHandleMenu?: FC<DragHandleMenuProps<BSchema>>;
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

  const DragHandleMenu = props.dragHandleMenu || DefaultDragHandleMenu;

  return (
    <Group spacing={0}>
      <ActionIcon size={24} data-test={"dragHandleAdd"}>
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
              data-test={"dragHandle"}>
              {<MdDragIndicator size={24} />}
            </ActionIcon>
          </div>
        </Menu.Target>
        <DragHandleMenu
          editor={props.editor}
          block={props.block}
          closeMenu={closeMenu}
        />
      </Menu>
    </Group>
  );
};
