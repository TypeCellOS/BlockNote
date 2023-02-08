import { AiOutlinePlus, MdDragIndicator } from "react-icons/all";
import { ActionIcon, createStyles, Group, Menu } from "@mantine/core";
import { useEffect, useRef } from "react";

export type BlockSideMenuProps = {
  addBlock: () => void;
  deleteBlock: () => void;
  blockDragStart: (event: DragEvent) => void;
  blockDragEnd: () => void;
  freezeMenu: () => void;
  unfreezeMenu: () => void;
};

export const BlockSideMenu = (props: BlockSideMenuProps) => {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "DragHandleMenu",
  });

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
      <Menu
        position={"left"}
        onOpen={props.freezeMenu}
        onClose={props.unfreezeMenu}>
        <Menu.Target>
          <div draggable="true" ref={dragHandleRef}>
            <ActionIcon
              size={24}
              color={"brandFinal.3"}
              data-test={"dragHandle"}>
              {<MdDragIndicator size={24} />}
            </ActionIcon>
          </div>
        </Menu.Target>
        <Menu.Dropdown className={classes.root}>
          <Menu.Item onClick={props.deleteBlock}>Delete</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
};
