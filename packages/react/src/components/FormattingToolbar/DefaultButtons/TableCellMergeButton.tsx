import {
  DefaultBlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback } from "react";
import { RiMergeCellsHorizontal, RiMergeCellsVertical } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useDictionary } from "../../../i18n/dictionary.js";

export const TableCellMergeButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    {
      table: DefaultBlockSchema["table"];
    },
    InlineContentSchema,
    StyleSchema
  >();

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (
        !editor.isEditable ||
        !editor.tableHandles ||
        !editor.settings.tables.splitCells
      ) {
        return undefined;
      }

      const selectedBlocks = editor.getSelection()?.blocks || [
        editor.getTextCursorPosition().block,
      ];

      if (selectedBlocks.length !== 1) {
        return undefined;
      }

      const block = selectedBlocks[0];

      if (block.type !== "table") {
        return undefined;
      }

      return {
        mergeDirection: editor.tableHandles.getMergeDirection(block),
      };
    },
  });

  const onClick = useCallback(() => {
    editor.tableHandles?.mergeCells();
  }, [editor]);

  if (state === undefined) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      label={dict.formatting_toolbar.table_cell_merge.tooltip}
      mainTooltip={dict.formatting_toolbar.table_cell_merge.tooltip}
      icon={
        state.mergeDirection === "horizontal" ? (
          <RiMergeCellsHorizontal />
        ) : (
          <RiMergeCellsVertical />
        )
      }
      onClick={onClick}
    />
  );
};
