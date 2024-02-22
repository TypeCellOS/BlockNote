import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { Menu } from "@mantine/core";
import { useCallback, useMemo, useState } from "react";

import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import { useEditorContentOrSelectionChange } from "../../../../hooks/useEditorContentOrSelectionChange";
import { usePreventMenuOverflow } from "../../../../hooks/usePreventMenuOverflow";
import { useSelectedBlocks } from "../../../../hooks/useSelectedBlocks";
import { ColorIcon } from "../../../mantine-shared/ColorPicker/ColorIcon";
import { ColorPicker } from "../../../mantine-shared/ColorPicker/ColorPicker";
import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";

function checkColorInSchema<Color extends "text" | "background">(
  color: Color,
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>
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
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const textColorInSchema = checkColorInSchema("text", editor);
  const backgroundColorInSchema = checkColorInSchema("background", editor);

  const selectedBlocks = useSelectedBlocks(editor);

  const [currentTextColor, setCurrentTextColor] = useState<string>(
    textColorInSchema
      ? editor.getActiveStyles().textColor || "default"
      : "default"
  );
  const [currentBackgroundColor, setCurrentBackgroundColor] = useState<string>(
    backgroundColorInSchema
      ? editor.getActiveStyles().backgroundColor || "default"
      : "default"
  );

  useEditorContentOrSelectionChange(() => {
    if (textColorInSchema) {
      setCurrentTextColor(editor.getActiveStyles().textColor || "default");
    }
    if (backgroundColorInSchema) {
      setCurrentBackgroundColor(
        editor.getActiveStyles().backgroundColor || "default"
      );
    }
  }, editor);

  const { ref, updateMaxHeight } = usePreventMenuOverflow();

  const setTextColor = useCallback(
    (color: string) => {
      if (!textColorInSchema) {
        throw Error(
          "Tried to set text color, but style does not exist in editor schema."
        );
      }

      editor.focus();
      color === "default"
        ? editor.removeStyles({ textColor: color })
        : editor.addStyles({ textColor: color });
    },
    [editor, textColorInSchema]
  );

  const setBackgroundColor = useCallback(
    (color: string) => {
      if (!backgroundColorInSchema) {
        throw Error(
          "Tried to set background color, but style does not exist in editor schema."
        );
      }

      editor.focus();
      color === "default"
        ? editor.removeStyles({ backgroundColor: color })
        : editor.addStyles({ backgroundColor: color });
    },
    [backgroundColorInSchema, editor]
  );

  const show = useMemo(() => {
    if (!textColorInSchema && !backgroundColorInSchema) {
      return false;
    }

    for (const block of selectedBlocks) {
      if (block.content !== undefined) {
        return true;
      }
    }

    return false;
  }, [backgroundColorInSchema, selectedBlocks, textColorInSchema]);

  if (!show) {
    return null;
  }

  return (
    <Menu withinPortal={false} onOpen={updateMaxHeight}>
      <Menu.Target>
        <ToolbarButton
          mainTooltip={"Colors"}
          icon={() => (
            <ColorIcon
              textColor={currentTextColor}
              backgroundColor={currentBackgroundColor}
              size={20}
            />
          )}
        />
      </Menu.Target>
      <div ref={ref}>
        <Menu.Dropdown>
          <ColorPicker
            text={
              textColorInSchema
                ? {
                    color: currentTextColor,
                    setColor: setTextColor,
                  }
                : undefined
            }
            background={
              backgroundColorInSchema
                ? {
                    color: currentBackgroundColor,
                    setColor: setBackgroundColor,
                  }
                : undefined
            }
          />
        </Menu.Dropdown>
      </div>
    </Menu>
  );
};
