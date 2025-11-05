import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback } from "react";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import { ColorIcon } from "../../ColorPicker/ColorIcon.js";
import { ColorPicker } from "../../ColorPicker/ColorPicker.js";

function checkColorInSchema<Color extends "text" | "background">(
  color: Color,
  editor: BlockNoteEditor<any, any, any>,
): editor is BlockNoteEditor<
  BlockSchema,
  InlineContentSchema,
  Color extends "text"
    ? {
        textColor: {
          type: "textColor";
          propSchema: "string";
        };
      }
    : {
        backgroundColor: {
          type: "backgroundColor";
          propSchema: "string";
        };
      }
> {
  return (
    `${color}Color` in editor.schema.styleSchema &&
    editor.schema.styleSchema[`${color}Color`].type === `${color}Color` &&
    editor.schema.styleSchema[`${color}Color`].propSchema === "string"
  );
}

export const ColorStyleButton = () => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const textColorInSchema = checkColorInSchema("text", editor);
  const backgroundColorInSchema = checkColorInSchema("background", editor);

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      // Do not show if:
      if (
        // The editor is read-only.
        !editor.isEditable ||
        // None of the selected blocks have inline content
        !(
          editor.getSelection()?.blocks || [
            editor.getTextCursorPosition().block,
          ]
        ).find((block) => block.content !== undefined)
      ) {
        return undefined;
      }

      const textColorInSchema = checkColorInSchema("text", editor);
      const backgroundColorInSchema = checkColorInSchema("background", editor);

      if (!textColorInSchema && !backgroundColorInSchema) {
        return undefined;
      }

      return {
        textColor: (textColorInSchema
          ? editor.getActiveStyles().textColor || "default"
          : undefined) as string | undefined,
        backgroundColor: (backgroundColorInSchema
          ? editor.getActiveStyles().backgroundColor || "default"
          : undefined) as string | undefined,
      };
    },
  });

  const setTextColor = useCallback(
    (color: string) => {
      if (!textColorInSchema) {
        throw Error(
          "Tried to set text color, but style does not exist in editor schema.",
        );
      }

      color === "default"
        ? editor.removeStyles({ textColor: color })
        : editor.addStyles({ textColor: color });

      setTimeout(() => {
        // timeout needed to ensure compatibility with Mantine Toolbar useFocusTrap
        editor.focus();
      });
    },
    [editor, textColorInSchema],
  );

  const setBackgroundColor = useCallback(
    (color: string) => {
      if (!backgroundColorInSchema) {
        throw Error(
          "Tried to set background color, but style does not exist in editor schema.",
        );
      }

      color === "default"
        ? editor.removeStyles({ backgroundColor: color })
        : editor.addStyles({ backgroundColor: color });

      setTimeout(() => {
        // timeout needed to ensure compatibility with Mantine Toolbar useFocusTrap
        editor.focus();
      });
    },
    [backgroundColorInSchema, editor],
  );

  if (state === undefined) {
    return null;
  }

  return (
    <Components.Generic.Menu.Root>
      <Components.Generic.Menu.Trigger>
        <Components.FormattingToolbar.Button
          className={"bn-button"}
          data-test="colors"
          label={dict.formatting_toolbar.colors.tooltip}
          mainTooltip={dict.formatting_toolbar.colors.tooltip}
          icon={
            <ColorIcon
              textColor={state.textColor}
              backgroundColor={state.backgroundColor}
              size={20}
            />
          }
        />
      </Components.Generic.Menu.Trigger>
      <Components.Generic.Menu.Dropdown
        className={"bn-menu-dropdown bn-color-picker-dropdown"}
      >
        <ColorPicker
          text={
            state.textColor
              ? {
                  color: state.textColor,
                  setColor: setTextColor,
                }
              : undefined
          }
          background={
            state.backgroundColor
              ? {
                  color: state.backgroundColor,
                  setColor: setBackgroundColor,
                }
              : undefined
          }
        />
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
};
