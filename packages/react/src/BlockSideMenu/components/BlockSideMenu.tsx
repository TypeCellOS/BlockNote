import { AiOutlinePlus, MdDragIndicator } from "react-icons/all";
import { ActionIcon, Box, createStyles, Group, Menu } from "@mantine/core";
import { useEffect, useRef } from "react";
import { ColorIcon } from "./ColorIcon";
import { TiTick } from "react-icons/ti";

export type BlockSideMenuProps = {
  addBlock: () => void;
  deleteBlock: () => void;
  blockDragStart: (event: DragEvent) => void;
  blockDragEnd: () => void;
  freezeMenu: () => void;
  unfreezeMenu: () => void;
  blockBackgroundColor: string;
  setBlockBackgroundColor: (color: string) => void;
  blockTextColor: string;
  setBlockTextColor: (color: string) => void;
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
          <Menu.Item component={"div"} onClick={props.deleteBlock}>
            Delete
          </Menu.Item>
          <Menu.Item>
            <Menu trigger={"hover"} position={"right"}>
              <Menu.Target>
                <Box>Colors</Box>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Text</Menu.Label>
                <Menu.Item
                  onClick={() => props.setBlockTextColor("default")}
                  component={"div"}
                  icon={<ColorIcon />}
                  rightSection={
                    props.blockTextColor === "default" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Default
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockTextColor("gray")}
                  component={"div"}
                  icon={<ColorIcon textColor={"#9b9a97"} />}
                  rightSection={
                    props.blockTextColor === "gray" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Gray
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockTextColor("brown")}
                  component={"div"}
                  icon={<ColorIcon textColor={"#64473a"} />}
                  rightSection={
                    props.blockTextColor === "brown" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Brown
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockTextColor("red")}
                  component={"div"}
                  icon={<ColorIcon textColor={"#e03e3e"} />}
                  rightSection={
                    props.blockTextColor === "red" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Red
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockTextColor("orange")}
                  component={"div"}
                  icon={<ColorIcon textColor={"#d9730d"} />}
                  rightSection={
                    props.blockTextColor === "orange" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Orange
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockTextColor("yellow")}
                  component={"div"}
                  icon={<ColorIcon textColor={"#dfab01"} />}
                  rightSection={
                    props.blockTextColor === "yellow" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Yellow
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockTextColor("green")}
                  component={"div"}
                  icon={<ColorIcon textColor={"#4d6461"} />}
                  rightSection={
                    props.blockTextColor === "green" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Green
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockTextColor("blue")}
                  component={"div"}
                  icon={<ColorIcon textColor={"#0b6e99"} />}
                  rightSection={
                    props.blockTextColor === "blue" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Blue
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockTextColor("purple")}
                  component={"div"}
                  icon={<ColorIcon textColor={"#6940a5"} />}
                  rightSection={
                    props.blockTextColor === "purple" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Purple
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockTextColor("pink")}
                  component={"div"}
                  icon={<ColorIcon textColor={"#ad1a72"} />}
                  rightSection={
                    props.blockTextColor === "pink" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Pink
                </Menu.Item>
                <Menu.Label>Background</Menu.Label>
                <Menu.Item
                  onClick={() => props.setBlockBackgroundColor("default")}
                  component={"div"}
                  icon={<ColorIcon />}
                  rightSection={
                    props.blockBackgroundColor === "default" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Default
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockBackgroundColor("gray")}
                  component={"div"}
                  icon={<ColorIcon backgroundColor={"#ebeced"} />}
                  rightSection={
                    props.blockBackgroundColor === "gray" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Gray
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockBackgroundColor("brown")}
                  component={"div"}
                  icon={<ColorIcon backgroundColor={"#e9e5e3"} />}
                  rightSection={
                    props.blockBackgroundColor === "brown" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Brown
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockBackgroundColor("red")}
                  component={"div"}
                  icon={<ColorIcon backgroundColor={"#fbe4e4"} />}
                  rightSection={
                    props.blockBackgroundColor === "red" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Red
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockBackgroundColor("orange")}
                  component={"div"}
                  icon={<ColorIcon backgroundColor={"#F6E9D9"} />}
                  rightSection={
                    props.blockBackgroundColor === "orange" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Orange
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockBackgroundColor("yellow")}
                  component={"div"}
                  icon={<ColorIcon backgroundColor={"#fbf3db"} />}
                  rightSection={
                    props.blockBackgroundColor === "yellow" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Yellow
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockBackgroundColor("green")}
                  component={"div"}
                  icon={<ColorIcon backgroundColor={"#ddedea"} />}
                  rightSection={
                    props.blockBackgroundColor === "green" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Green
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockBackgroundColor("blue")}
                  component={"div"}
                  icon={<ColorIcon backgroundColor={"#ddebf1"} />}
                  rightSection={
                    props.blockBackgroundColor === "blue" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Blue
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockBackgroundColor("purple")}
                  component={"div"}
                  icon={<ColorIcon backgroundColor={"#eae4f2"} />}
                  rightSection={
                    props.blockBackgroundColor === "purple" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Purple
                </Menu.Item>
                <Menu.Item
                  onClick={() => props.setBlockBackgroundColor("pink")}
                  component={"div"}
                  icon={<ColorIcon backgroundColor={"#f4dfeb"} />}
                  rightSection={
                    props.blockBackgroundColor === "pink" ? (
                      <TiTick size={16} style={{ paddingLeft: "8px" }} />
                    ) : (
                      <div style={{ width: "24px", padding: "0" }} />
                    )
                  }>
                  Pink
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
};
