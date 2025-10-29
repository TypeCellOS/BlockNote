import {
  blockHasType,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useMemo } from "react";
import { RiDeleteBin7Line } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useDictionary } from "../../../i18n/dictionary.js";

export const FileDeleteButton = () => {
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
        })
      ) {
        return undefined;
      }

      return { blockId: block.id, blockType: block.type };
    },
  });

  const onClick = useCallback(() => {
    if (state !== undefined) {
      editor.focus();
      editor.removeBlocks([state.blockId]);
    }
  }, [editor, state]);

  if (state === undefined) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      label={
        dict.formatting_toolbar.file_delete.tooltip[state.blockType] ||
        dict.formatting_toolbar.file_delete.tooltip["file"]
      }
      mainTooltip={
        dict.formatting_toolbar.file_delete.tooltip[state.blockType] ||
        dict.formatting_toolbar.file_delete.tooltip["file"]
      }
      icon={<RiDeleteBin7Line />}
      onClick={onClick}
    />
  );
};
