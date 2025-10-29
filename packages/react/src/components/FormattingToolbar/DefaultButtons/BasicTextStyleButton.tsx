import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  formatKeyboardShortcut,
} from "@blocknote/core";
import { useCallback } from "react";
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
import { useEditorState } from "../../../hooks/useEditorState.js";
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

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      // Do not show if:
      if (
        // The editor is read-only.
        !editor.isEditable ||
        // The style is not in the schema.
        !checkBasicTextStyleInSchema(props.basicTextStyle, editor) ||
        // None of the selected blocks have inline content
        !(
          editor.getSelection()?.blocks || [
            editor.getTextCursorPosition().block,
          ]
        ).find((block) => block.content !== undefined)
      ) {
        return undefined;
      }

      return props.basicTextStyle in editor.getActiveStyles()
        ? { active: true }
        : { active: false };
    },
  });

  const toggleStyle = useCallback(
    (style: typeof props.basicTextStyle) => {
      editor.focus();
      editor.toggleStyles({ [style]: true } as any);
    },
    [editor, props],
  );

  if (state === undefined) {
    return null;
  }

  const Icon = icons[props.basicTextStyle] as any; // TODO
  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      data-test={props.basicTextStyle}
      onClick={() => toggleStyle(props.basicTextStyle)}
      isSelected={state.active}
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
