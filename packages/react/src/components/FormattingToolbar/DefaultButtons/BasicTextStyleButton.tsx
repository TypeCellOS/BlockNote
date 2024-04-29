import {
  BlockNoteEditor,
  BlockSchema,
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

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useDictionaryContext } from "../../../editor/Dictionary";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { useEditorContentOrSelectionChange } from "../../../hooks/useEditorContentOrSelectionChange";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";

type BasicTextStyle = "bold" | "italic" | "underline" | "strike" | "code";

const icons = {
  bold: RiBold,
  italic: RiItalic,
  underline: RiUnderline,
  strike: RiStrikethrough,
  code: RiCodeFill,
} satisfies Record<BasicTextStyle, IconType>;

function checkBasicTextStyleInSchema<Style extends BasicTextStyle>(
  style: Style,
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>
): editor is BlockNoteEditor<
  BlockSchema,
  InlineContentSchema,
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

export const BasicTextStyleButton = <Style extends BasicTextStyle>(props: {
  basicTextStyle: Style;
}) => {
  const dict = useDictionaryContext();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const basicTextStyleInSchema = checkBasicTextStyleInSchema(
    props.basicTextStyle,
    editor
  );

  const selectedBlocks = useSelectedBlocks(editor);

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
    return !!selectedBlocks.find((block) => block.content !== undefined);
  }, [basicTextStyleInSchema, selectedBlocks]);

  if (!show) {
    return null;
  }

  const Icon = icons[props.basicTextStyle] as any; // TODO
  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      data-test={props.basicTextStyle}
      onClick={() => toggleStyle(props.basicTextStyle)}
      isSelected={active}
      mainTooltip={dict.formatting_toolbar[props.basicTextStyle].tooltip}
      secondaryTooltip={formatKeyboardShortcut(
        dict.formatting_toolbar[props.basicTextStyle].secondary_tooltip,
        dict.generic.ctrl_shortcut
      )}
      icon={<Icon />}
    />
  );
};
