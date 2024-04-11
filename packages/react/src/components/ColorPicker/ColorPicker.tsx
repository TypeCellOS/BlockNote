import { useComponentsContext } from "../../editor/ComponentsContext";
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
  const Components = useComponentsContext()!;

  const TextColorSection = () =>
    props.text ? (
      <>
        <Components.Generic.Menu.Label>Text</Components.Generic.Menu.Label>
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
          <Components.Generic.Menu.Item
            onClick={() => {
              props.onClick && props.onClick();
              props.text!.setColor(color);
            }}
            data-test={"text-color-" + color}
            icon={<ColorIcon textColor={color} size={props.iconSize} />}
            checked={props.text!.color === color}
            key={"text-color-" + color}>
            {color.charAt(0).toUpperCase() + color.slice(1)}
          </Components.Generic.Menu.Item>
        ))}
      </>
    ) : null;

  const BackgroundColorSection = () =>
    props.background ? (
      <>
        <Components.Generic.Menu.Label>
          Background
        </Components.Generic.Menu.Label>
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
          <Components.Generic.Menu.Item
            onClick={() => {
              props.onClick && props.onClick();
              props.background!.setColor(color);
            }}
            data-test={"background-color-" + color}
            icon={<ColorIcon backgroundColor={color} size={props.iconSize} />}
            key={"background-color-" + color}
            checked={props.background!.color === color}>
            {color.charAt(0).toUpperCase() + color.slice(1)}
          </Components.Generic.Menu.Item>
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
