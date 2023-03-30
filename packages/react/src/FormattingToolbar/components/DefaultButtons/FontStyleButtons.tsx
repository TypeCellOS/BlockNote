import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { formatKeyboardShortcut } from "../../../utils";
import { RiBold, RiItalic, RiStrikethrough, RiUnderline } from "react-icons/ri";

export type ToggleBoldButtonProps = {
  boldIsActive: boolean;
  toggleBold: () => void;
};

export type ToggleItalicButtonProps = {
  italicIsActive: boolean;
  toggleItalic: () => void;
};

export type ToggleUnderlineButtonProps = {
  underlineIsActive: boolean;
  toggleUnderline: () => void;
};

export type ToggleStrikeButtonProps = {
  strikeIsActive: boolean;
  toggleStrike: () => void;
};

export const ToggleBoldButton = (props: ToggleBoldButtonProps) => (
  <ToolbarButton
    onClick={props.toggleBold}
    isSelected={props.boldIsActive}
    mainTooltip="Bold"
    secondaryTooltip={formatKeyboardShortcut("Mod+B")}
    icon={RiBold}
  />
);

export const ToggleItalicButton = (props: ToggleItalicButtonProps) => (
  <ToolbarButton
    onClick={props.toggleItalic}
    isSelected={props.italicIsActive}
    mainTooltip="Italic"
    secondaryTooltip={formatKeyboardShortcut("Mod+I")}
    icon={RiItalic}
  />
);

export const ToggleUnderlineButton = (props: ToggleUnderlineButtonProps) => (
  <ToolbarButton
    onClick={props.toggleUnderline}
    isSelected={props.underlineIsActive}
    mainTooltip="Underline"
    secondaryTooltip={formatKeyboardShortcut("Mod+U")}
    icon={RiUnderline}
  />
);

export const ToggleStrikethroughButton = (props: ToggleStrikeButtonProps) => (
  <ToolbarButton
    onClick={props.toggleStrike}
    isSelected={props.strikeIsActive}
    mainTooltip="Strikethrough"
    secondaryTooltip={formatKeyboardShortcut("Mod+Shift+X")}
    icon={RiStrikethrough}
  />
);
