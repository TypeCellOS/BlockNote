import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
} from "@blocknote/core";
import { useMemo, useState } from "react";
import {
  RiBold,
  RiCodeFill,
  RiItalic,
  RiStrikethrough,
  RiUnderline,
} from "react-icons/ri";

import { StyleSchema } from "@blocknote/core";
import { ToolbarButton } from "../../../components-shared/Toolbar/ToolbarButton";
import { useEditorChange } from "../../../hooks/useEditorChange";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";
import { formatKeyboardShortcut } from "@blocknote/core";

const shortcuts = {
  bold: "Mod+B",
  italic: "Mod+I",
  underline: "Mod+U",
  strike: "Mod+Shift+X",
  code: "",
};

const icons = {
  bold: RiBold,
  italic: RiItalic,
  underline: RiUnderline,
  strike: RiStrikethrough,
  code: RiCodeFill,
};

export const ToggledStyleButton = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  toggledStyle: keyof typeof shortcuts;
}) => {
  const selectedBlocks = useSelectedBlocks(props.editor);

  const [active, setActive] = useState<boolean>(
    props.toggledStyle in props.editor.getActiveStyles()
  );

  useEditorChange(props.editor, () => {
    setActive(props.toggledStyle in props.editor.getActiveStyles());
  });

  const toggleStyle = (style: typeof props.toggledStyle) => {
    props.editor.focus();
    if (props.editor.styleSchema[style].propSchema !== "boolean") {
      throw new Error("can only toggle boolean styles");
    }
    props.editor.toggleStyles({ [style]: true } as any);
  };

  const show = useMemo(() => {
    return !!selectedBlocks.find((block) => block.content !== undefined);
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
