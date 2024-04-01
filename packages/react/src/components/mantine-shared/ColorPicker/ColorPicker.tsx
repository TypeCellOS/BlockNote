import { Menu } from "@mantine/core";
import { ColorIcon } from "./ColorIcon";
import { TiTick } from "react-icons/ti";

export const ColorPicker = (props: {
  onClick?: () => void;
  iconSize?: number;
  text?: {
    color: string;
    setColor: (color: string) => void;
  };
  background?: {
    color: string;
    setColor: (color: string) => void;
  };
}) => {
  const TextColorSection = () =>
    props.text ? (
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
              props.text!.setColor(color);
            }}
            component={"div"}
            data-test={"text-color-" + color}
            leftSection={<ColorIcon textColor={color} size={props.iconSize} />}
            rightSection={
              props.text!.color === color ? (
                <TiTick size={20} className={"bn-tick-icon"} />
              ) : (
                <div className={"bn-tick-space"} />
              )
            }
            key={"text-color-" + color}>
            {color.charAt(0).toUpperCase() + color.slice(1)}
          </Menu.Item>
        ))}
      </>
    ) : null;

  const BackgroundColorSection = () =>
    props.background ? (
      <>
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
              props.background!.setColor(color);
            }}
            component={"div"}
            data-test={"background-color-" + color}
            leftSection={
              <ColorIcon backgroundColor={color} size={props.iconSize} />
            }
            key={"background-color-" + color}
            rightSection={
              props.background!.color === color ? (
                <TiTick size={20} className={"bn-tick-icon"} />
              ) : (
                <div className={"bn-tick-space"} />
              )
            }>
            {color.charAt(0).toUpperCase() + color.slice(1)}
          </Menu.Item>
        ))}
      </>
    ) : null;

  return (
    <>
      <TextColorSection />
      <BackgroundColorSection />
    </>
  );
};
