import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { formatKeyboardShortcut } from "../../../utils";
import {
  RiBold,
  RiCodeFill,
  RiItalic,
  RiStrikethrough,
  RiUnderline,
} from "react-icons/ri";
import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  ToggledStyle,
} from "@blocknote/core";
import { IconType } from "react-icons";
import { useMemo, useState } from "react";
import { useEditorContentChange } from "../../../hooks/useEditorContentChange";
import { useEditorSelectionChange } from "../../../hooks/useEditorSelectionChange";

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
  const [selectedBlocks, setSelectedBlocks] = useState<Block<BSchema>[]>(
    props.editor.getSelection()?.blocks || [
      props.editor.getTextCursorPosition().block,
    ]
  );
  const [active, setActive] = useState<boolean>(
    props.toggledStyle in props.editor.getActiveStyles()
  );

  useEditorContentChange(props.editor, () => {
    setSelectedBlocks(
      props.editor.getSelection()?.blocks || [
        props.editor.getTextCursorPosition().block,
      ]
    );
    setActive(props.toggledStyle in props.editor.getActiveStyles());
  });

  useEditorSelectionChange(props.editor, () => {
    setSelectedBlocks(
      props.editor.getSelection()?.blocks || [
        props.editor.getTextCursorPosition().block,
      ]
    );
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
