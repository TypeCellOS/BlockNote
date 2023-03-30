import { RiAlignCenter, RiAlignLeft, RiAlignRight } from "react-icons/ri";
import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";

export type TextAlignButtonProps = {
  textAlignment: "left" | "center" | "right" | "justify";
  setTextAlignment: (
    textAlignment: "left" | "center" | "right" | "justify"
  ) => void;
};

export const TextAlignLeftButton = (props: TextAlignButtonProps) => (
  <ToolbarButton
    onClick={() => props.setTextAlignment("left")}
    isSelected={props.textAlignment === "left"}
    mainTooltip={"Align Text Left"}
    icon={RiAlignLeft}
  />
);

export const TextAlignCenterButton = (props: TextAlignButtonProps) => (
  <ToolbarButton
    onClick={() => props.setTextAlignment("center")}
    isSelected={props.textAlignment === "center"}
    mainTooltip={"Align Text Center"}
    icon={RiAlignCenter}
  />
);

export const TextAlignRightButton = (props: TextAlignButtonProps) => (
  <ToolbarButton
    onClick={() => props.setTextAlignment("right")}
    isSelected={props.textAlignment === "right"}
    mainTooltip={"Align Text Right"}
    icon={RiAlignRight}
  />
);
