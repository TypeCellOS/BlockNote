import { useMemo, useState } from "react";
import { BlockNoteEditor, BlockSchema, ToggledStyle } from "@blocknote/core";
import { IconType } from "react-icons";
import {
  RiBold,
  RiCodeFill,
  RiItalic,
  RiStrikethrough,
  RiUnderline,
} from "react-icons/ri";

import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";
import { useEditorChange } from "../../../hooks/useEditorChange";
import { formatKeyboardShortcut } from "../../../utils";

const shortcuts: Record<ToggledStyle, string> = {
  bold: "Mod+B",
  italic: "Mod+I",
  underline: "Mod+U",
  strike: "Mod+Shift+X",
  code: "",
};

const icons: Record<ToggledStyle, IconType> = {
  bold: RiBold,
  italic: RiItalic,
  underline: RiUnderline,
  strike: RiStrikethrough,
  code: RiCodeFill,
};

export const ToggledStyleButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
  toggledStyle: ToggledStyle;
}) => {
  const selectedBlocks = useSelectedBlocks(props.editor);

  const [active, setActive] = useState<boolean>(
    props.toggledStyle in props.editor.getActiveStyles()
  );

  useEditorChange(props.editor, () => {
    setActive(props.toggledStyle in props.editor.getActiveStyles());
  });

  const toggleStyle = (style: ToggledStyle) => {
    props.editor.focus();
    props.editor.toggleStyles({ [style]: true });
  };

  const show = useMemo(() => {
    for (const block of selectedBlocks) {
      if (block.content !== undefined) {
        return true;
      }
    }

    return false;
  }, [selectedBlocks]);

  if (!show) {
    return null;
  }

  return (
    <ToolbarButton
      onClick={() => toggleStyle(props.toggledStyle)}
      isSelected={active}
      mainTooltip={
        props.toggledStyle.slice(0, 1).toUpperCase() +
        props.toggledStyle.slice(1)
      }
      secondaryTooltip={formatKeyboardShortcut(shortcuts[props.toggledStyle])}
      icon={icons[props.toggledStyle]}
    />
  );
};
