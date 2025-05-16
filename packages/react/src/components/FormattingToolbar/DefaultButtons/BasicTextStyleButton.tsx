import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  formatKeyboardShortcut,
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

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorContentOrSelectionChange } from "../../../hooks/useEditorContentOrSelectionChange.js";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks.js";
import { useDictionary } from "../../../i18n/dictionary.js";

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
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, any>,
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
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const basicTextStyleInSchema = checkBasicTextStyleInSchema(
    props.basicTextStyle,
    editor,
  );

  const selectedBlocks = useSelectedBlocks(editor);

  const [active, setActive] = useState<boolean>(
    props.basicTextStyle in editor.getActiveStyles(),
  );

  useEditorContentOrSelectionChange(() => {
    if (basicTextStyleInSchema) {
      setActive(props.basicTextStyle in editor.getActiveStyles());
    }
  }, editor);

  const toggleStyle = (style: typeof props.basicTextStyle) => {
    editor.focus();

    if (!basicTextStyleInSchema) {
      return;
    }

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

  if (!show || !editor.isEditable) {
    return null;
  }

  const Icon = icons[props.basicTextStyle] as any; // TODO
  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      data-test={props.basicTextStyle}
      onClick={() => toggleStyle(props.basicTextStyle)}
      isSelected={active}
      label={dict.formatting_toolbar[props.basicTextStyle].tooltip}
      mainTooltip={dict.formatting_toolbar[props.basicTextStyle].tooltip}
      secondaryTooltip={formatKeyboardShortcut(
        dict.formatting_toolbar[props.basicTextStyle].secondary_tooltip,
        dict.generic.ctrl_shortcut,
      )}
      icon={<Icon />}
    />
  );
};
