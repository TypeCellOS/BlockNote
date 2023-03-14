import { Menu } from "@mantine/core";
import { ColorIcon } from "./ColorIcon";
import { TiTick } from "react-icons/ti";

export const ColorPicker = (props: {
  onClick?: () => void;
  iconSize?: number;
  textColor: string;
  setTextColor: (color: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
}) => {
  return (
    <>
      <Menu.Label>Text</Menu.Label>
      {[
        "default",
        "gray",
        "brown",
        "red",
        "orange",
        "yellow",
        "green",
        "blue",
        "purple",
        "pink",
      ].map((color) => (
        <Menu.Item
          onClick={() => {
            props.onClick && props.onClick();
            props.setTextColor(color);
          }}
          component={"div"}
          data-test={"text-color-" + color}
          icon={<ColorIcon textColor={color} size={props.iconSize} />}
          key={"text-color-" + color}
          rightSection={
            props.textColor === color ? (
              <TiTick size={16} style={{ paddingLeft: "8px" }} />
            ) : (
              <div style={{ width: "24px", padding: "0" }} />
            )
          }>
          {color.charAt(0).toUpperCase() + color.slice(1)}
        </Menu.Item>
      ))}
      <Menu.Label>Background</Menu.Label>
      {[
        "default",
        "gray",
        "brown",
        "red",
        "orange",
        "yellow",
        "green",
        "blue",
        "purple",
        "pink",
      ].map((color) => (
        <Menu.Item
          onClick={() => {
            props.onClick && props.onClick();
            props.setBackgroundColor(color);
          }}
          component={"div"}
          data-test={"background-color-" + color}
          icon={<ColorIcon backgroundColor={color} size={props.iconSize} />}
          key={"background-color-" + color}
          rightSection={
            props.backgroundColor === color ? (
              <TiTick size={16} style={{ paddingLeft: "8px" }} />
            ) : (
              <div style={{ width: "24px", padding: "0" }} />
            )
          }>
          {color.charAt(0).toUpperCase() + color.slice(1)}
        </Menu.Item>
      ))}
    </>
  );
};
