import { formatKeyboardShortcut } from "../../../utils";
import { RiIndentDecrease, RiIndentIncrease } from "react-icons/ri";
import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";

export type IncreaseBlockIndentButtonProps = {
  canIncreaseBlockIndent: boolean;
  increaseBlockIndent: () => void;
};

export type DecreaseBlockIndentButtonProps = {
  canDecreaseBlockIndent: boolean;
  decreaseBlockIndent: () => void;
};

export const IncreaseBlockIndentButton = (
  props: IncreaseBlockIndentButtonProps
) => (
  <ToolbarButton
    onClick={props.increaseBlockIndent}
    isDisabled={!props.canIncreaseBlockIndent}
    mainTooltip="Indent"
    secondaryTooltip={formatKeyboardShortcut("Tab")}
    icon={RiIndentIncrease}
  />
);

export const DecreaseBlockIndentButton = (
  props: DecreaseBlockIndentButtonProps
) => (
  <ToolbarButton
    onClick={props.decreaseBlockIndent}
    isDisabled={!props.canDecreaseBlockIndent}
    mainTooltip="Decrease Indent"
    secondaryTooltip={formatKeyboardShortcut("Shift+Tab")}
    icon={RiIndentDecrease}
  />
);
