import {
  blockHasType,
  BlockSchema,
  editorHasBlockWithType,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback } from "react";
import { RiImageAddFill } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useDictionary } from "../../../i18n/dictionary.js";

export const FilePreviewButton = () => {
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
      if (!editor.isEditable) {
        return undefined;
      }

      const selectedBlocks = editor.getSelection()?.blocks || [
        editor.getTextCursorPosition().block,
      ];

      if (selectedBlocks.length !== 1) {
        return undefined;
      }

      const block = selectedBlocks[0];

      if (
        !blockHasType(block, editor, block.type, {
          url: "string",
          showPreview: "boolean",
        })
      ) {
        return undefined;
      }

      return {
        blockId: block.id,
        blockType: block.type,
        showPreview: block.props.showPreview,
      };
    },
  });

  const onClick = useCallback(() => {
    if (
      state !== undefined &&
      editorHasBlockWithType(editor, state.blockType, {
        showPreview: "boolean",
      })
    ) {
      editor.updateBlock(state.blockId, {
        props: {
          showPreview: !state.showPreview,
        },
      });
    }
  }, [editor, state]);

  if (state === undefined) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      label={"Toggle preview"}
      mainTooltip={dict.formatting_toolbar.file_preview_toggle.tooltip}
      icon={<RiImageAddFill />}
      isSelected={state.showPreview}
      onClick={onClick}
    />
  );
};
