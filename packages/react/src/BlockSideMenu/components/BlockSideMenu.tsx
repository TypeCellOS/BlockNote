import {
  AiOutlinePlus,
  MdDragIndicator,
  RiDeleteBin5Fill,
  RiLockFill,
  RiLockUnlockFill,
} from "react-icons/all";
import { ActionIcon, createStyles, Group, Menu } from "@mantine/core";
import { useEffect, useRef, useState } from "react";

export type BlockSideMenuProps = {
  addBlock: () => void;
  deleteBlock: () => void;
  menuFrozen: boolean;
  setMenuFrozen: (menuFrozen: boolean) => void;
  blockEditable: boolean;
  setBlockEditable: (blockEditable: boolean) => void;

  blockDragStart: (event: DragEvent) => void;
  blockDragEnd: () => void;
};

export const BlockSideMenu = (props: BlockSideMenuProps) => {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "DragHandleMenu",
  });

  const [menuEditableText, setMenuEditableText] = useState("Lock");

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
        onOpen={() => {
          // Lock/Unlock text is set on menu open only, as setting them on prop change causes the text to change before
          // the menu close animation completes when the button is clicked, which looks unpolished.
          setMenuEditableText(props.blockEditable ? "Lock" : "Unlock");
          props.setMenuFrozen(true);
        }}
        onClose={() => props.setMenuFrozen(false)}>
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
          <Menu.Label>Block Actions</Menu.Label>
          <Menu.Item icon={<RiDeleteBin5Fill />} onClick={props.deleteBlock}>
            Delete
          </Menu.Item>
          <Menu.Item
            icon={
              menuEditableText === "Lock" ? (
                <RiLockFill />
              ) : (
                <RiLockUnlockFill />
              )
            }
            onClick={() => props.setBlockEditable(!props.blockEditable)}>
            {menuEditableText}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
};
