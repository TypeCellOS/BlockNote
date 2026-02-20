import {
  DefaultBlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { TableHandlesExtension } from "@blocknote/core/extensions";
import { useCallback } from "react";
import { RiMergeCellsHorizontal, RiMergeCellsVertical } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useExtension } from "../../../hooks/useExtension.js";
import { useDictionary } from "../../../i18n/dictionary.js";

const TableCellMergeButtonInner = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    {
      table: DefaultBlockSchema["table"];
    },
    InlineContentSchema,
    StyleSchema
  >();

  const tableHandles = useExtension(TableHandlesExtension);
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable || !editor.settings.tables.splitCells) {
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
        mergeDirection: tableHandles.getMergeDirection(block),
      };
    },
  });

  const onClick = useCallback(() => {
    tableHandles?.mergeCells();
  }, [tableHandles]);

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

export const TableCellMergeButton = () => {
  const editor = useBlockNoteEditor();
  if (!editor.getExtension(TableHandlesExtension)) {
    return null;
  }
  return <TableCellMergeButtonInner />;
};
