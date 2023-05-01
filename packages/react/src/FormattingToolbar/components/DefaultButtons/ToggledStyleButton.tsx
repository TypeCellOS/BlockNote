import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { formatKeyboardShortcut } from "../../../utils";
import { RiBold, RiItalic, RiStrikethrough, RiUnderline } from "react-icons/ri";
import { BlockNoteEditor, BlockSchema, ToggledStyle } from "@blocknote/core";
import { useCallback } from "react";
import { IconType } from "react-icons";

const shortcuts: Record<ToggledStyle, string> = {
  bold: "Mod+B",
  italic: "Mod+I",
  underline: "Mod+U",
  strike: "Mod+Shift+X",
};

const icons: Record<ToggledStyle, IconType> = {
  bold: RiBold,
  italic: RiItalic,
  underline: RiUnderline,
  strike: RiStrikethrough,
};

export const ToggledStyleButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
  toggledStyle: ToggledStyle;
}) => {
  const styleIsActive = useCallback(
    (style: ToggledStyle) => {
      return style in props.editor.getActiveStyles();
    },
    [props]
  );

  const toggleStyle = useCallback(
    (style: ToggledStyle) => {
      props.editor.focus();
      props.editor.toggleStyles({ [style]: true });
    },
    [props]
  );

  return (
    <ToolbarButton
      onClick={() => toggleStyle(props.toggledStyle)}
      isSelected={styleIsActive(props.toggledStyle)}
      mainTooltip={
        props.toggledStyle.slice(0, 1).toUpperCase() +
        props.toggledStyle.slice(1)
      }
      secondaryTooltip={formatKeyboardShortcut(shortcuts[props.toggledStyle])}
      icon={icons[props.toggledStyle]}
    />
  );
};
