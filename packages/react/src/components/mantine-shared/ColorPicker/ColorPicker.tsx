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
            data-test={"text-color-" + color}
            icon={<ColorIcon textColor={color} size={props.iconSize} />}
            checked={props.text!.color === color}
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
            data-test={"background-color-" + color}
            icon={<ColorIcon backgroundColor={color} size={props.iconSize} />}
            key={"background-color-" + color}
            checked={props.background!.color === color}>
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
