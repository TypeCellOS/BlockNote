import { TiTick } from "react-icons/ti";
import { useComponentsContext } from "../../../editor/ComponentsContext";
import { ColorIcon } from "./ColorIcon";

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
  const components = useComponentsContext()!;

  const TextColorSection = () =>
    props.text ? (
      <>
        <components.MenuLabel>Text</components.MenuLabel>
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
          <components.MenuItem
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
          </components.MenuItem>
        ))}
      </>
    ) : null;

  const BackgroundColorSection = () =>
    props.background ? (
      <>
        <components.MenuLabel>Background</components.MenuLabel>
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
          <components.MenuItem
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
          </components.MenuItem>
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
