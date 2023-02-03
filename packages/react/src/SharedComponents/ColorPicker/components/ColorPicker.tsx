import { Menu } from "@mantine/core";
import { ColorIcon } from "./ColorIcon";
import { TiTick } from "react-icons/ti";

export const ColorPicker = (props: {
  targetElement: JSX.Element;
  iconSize?: number;
  blockTextColor: string;
  setBlockTextColor: (color: string) => void;
  blockBackgroundColor: string;
  setBlockBackgroundColor: (color: string) => void;
}) => {
  const Target = props.targetElement;

  return (
    <Menu trigger={"hover"} position={"right"}>
      <Menu.Target>{Target}</Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Text</Menu.Label>
        <Menu.Item
          onClick={() => props.setBlockTextColor("default")}
          component={"div"}
          icon={<ColorIcon textColor={"default"} size={props.iconSize} />}
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
          icon={<ColorIcon textColor={"gray"} size={props.iconSize} />}
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
          icon={<ColorIcon textColor={"brown"} size={props.iconSize} />}
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
          icon={<ColorIcon textColor={"red"} size={props.iconSize} />}
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
          icon={<ColorIcon textColor={"orange"} size={props.iconSize} />}
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
          icon={<ColorIcon textColor={"yellow"} size={props.iconSize} />}
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
          icon={<ColorIcon textColor={"green"} size={props.iconSize} />}
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
          icon={<ColorIcon textColor={"blue"} size={props.iconSize} />}
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
          icon={<ColorIcon textColor={"purple"} size={props.iconSize} />}
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
          icon={<ColorIcon textColor={"pink"} size={props.iconSize} />}
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
          icon={<ColorIcon backgroundColor={"default"} size={props.iconSize} />}
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
          icon={<ColorIcon backgroundColor={"gray"} size={props.iconSize} />}
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
          icon={<ColorIcon backgroundColor={"brown"} size={props.iconSize} />}
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
          icon={<ColorIcon backgroundColor={"red"} size={props.iconSize} />}
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
          icon={<ColorIcon backgroundColor={"orange"} size={props.iconSize} />}
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
          icon={<ColorIcon backgroundColor={"yellow"} size={props.iconSize} />}
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
          icon={<ColorIcon backgroundColor={"green"} size={props.iconSize} />}
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
          icon={<ColorIcon backgroundColor={"blue"} size={props.iconSize} />}
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
          icon={<ColorIcon backgroundColor={"purple"} size={props.iconSize} />}
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
          icon={<ColorIcon backgroundColor={"pink"} size={props.iconSize} />}
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
  );
};
