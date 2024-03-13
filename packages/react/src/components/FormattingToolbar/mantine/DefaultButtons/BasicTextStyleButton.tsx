import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  formatKeyboardShortcut,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useMemo, useState } from "react";
import { IconType } from "react-icons";
import {
  RiBold,
  RiCodeFill,
  RiItalic,
  RiStrikethrough,
  RiUnderline,
} from "react-icons/ri";

import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import { useEditorContentOrSelectionChange } from "../../../../hooks/useEditorContentOrSelectionChange";
import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";

type BasicTextStyle = "bold" | "italic" | "underline" | "strike" | "code";

const icons = {
  bold: RiBold,
  italic: RiItalic,
  underline: RiUnderline,
  strike: RiStrikethrough,
  code: RiCodeFill,
} satisfies Record<BasicTextStyle, IconType>;

const shortcuts = {
  bold: "Mod+B",
  italic: "Mod+I",
  underline: "Mod+U",
  strike: "Mod+Shift+X",
  code: "",
} satisfies Record<BasicTextStyle, string>;

function checkBasicTextStyleInSchema<
  Style extends BasicTextStyle,
  BSchema extends BlockSchema,
  I extends InlineContentSchema
>(
  style: Style,
  editor: BlockNoteEditor<BSchema, I, any>
): editor is BlockNoteEditor<
  BSchema,
  I,
  {
    [k in Style]: {
      type: k;
      propSchema: "boolean";
    };
  }
> {
  return (
    style in editor.schema.styleSchema &&
    editor.schema.styleSchema[style].type === style &&
    editor.schema.styleSchema[style].propSchema === "boolean"
  );
}

export const BasicTextStyleButton = <
  Style extends BasicTextStyle,
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  basicTextStyle: Style;
  selectedBlocks: Block<BSchema, I, S>[];
}) => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const basicTextStyleInSchema = checkBasicTextStyleInSchema(
    props.basicTextStyle,
    editor
  );

  const [active, setActive] = useState<boolean>(
    props.basicTextStyle in editor.getActiveStyles()
  );

  useEditorContentOrSelectionChange(() => {
    if (basicTextStyleInSchema) {
      setActive(props.basicTextStyle in editor.getActiveStyles());
    }
  }, editor);

  const toggleStyle = (style: typeof props.basicTextStyle) => {
    if (!basicTextStyleInSchema) {
      return;
    }

    editor.focus();
    if (editor.schema.styleSchema[style].propSchema !== "boolean") {
      throw new Error("can only toggle boolean styles");
    }
    editor.toggleStyles({ [style]: true } as any);
  };

  const show = useMemo(() => {
    if (!basicTextStyleInSchema) {
      return false;
    }
    // Also don't show when none of the selected blocks have text content
    return !!props.selectedBlocks.find((block) => block.content !== undefined);
  }, [basicTextStyleInSchema, props.selectedBlocks]);

  if (!show) {
    return null;
  }

  return (
    <ToolbarButton
      onClick={() => toggleStyle(props.basicTextStyle)}
      isSelected={active}
      mainTooltip={
        props.basicTextStyle.slice(0, 1).toUpperCase() +
        props.basicTextStyle.slice(1)
      }
      secondaryTooltip={formatKeyboardShortcut(shortcuts[props.basicTextStyle])}
      icon={icons[props.basicTextStyle]}
    />
  );
};
