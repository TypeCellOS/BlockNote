import {
  Block,
  BlockNoteEditor,
  DefaultBlockSchema,
  InlineContentSchema,
  isTableCellSelection,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useMemo } from "react";
import { RiMergeCellsHorizontal, RiMergeCellsVertical } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks.js";
import { useDictionary } from "../../../i18n/dictionary.js";

/**
 * Gets the direction of the merge. Based on the current cell selection if there is one.
 */
function getMergeDirection(
  editor: BlockNoteEditor<
    {
      table: DefaultBlockSchema["table"];
    },
    any,
    any
  >,
  block:
    | Block<
        {
          table: DefaultBlockSchema["table"];
        },
        any,
        any
      >
    | undefined
): undefined | "horizontal" | "vertical" {
  const tableHandles = editor.tableHandles;

  const cellSelection = isTableCellSelection(
    editor._tiptapEditor.state.selection
  )
    ? editor._tiptapEditor.state.selection
    : undefined;

  if (
    !cellSelection ||
    !block ||
    !tableHandles ||
    // Only offer the merge button if there is more than one cell selected.
    cellSelection.ranges.length <= 1
  ) {
    return undefined;
  }

  const { $anchorCell, $headCell } = cellSelection;
  const anchorRowIndex = $anchorCell.index($anchorCell.depth - 1);
  const anchorColIndex = $anchorCell.index();
  const anchorResolved = tableHandles.resolveRelativeTableCellIndices(
    { row: anchorRowIndex, col: anchorColIndex },
    block
  );

  const headRowIndex = $headCell.index($headCell.depth - 1);
  const headColIndex = $headCell.index();
  const headResolved = tableHandles.resolveRelativeTableCellIndices(
    { row: headRowIndex, col: headColIndex },
    block
  );

  if (anchorResolved.col === headResolved.col) {
    return "vertical";
  }

  return "horizontal";
}

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

  const selectedBlocks = useSelectedBlocks(editor);
  const mergeDirection = useMemo(() => {
    // Checks if only one block is selected.
    if (selectedBlocks.length !== 1) {
      return undefined;
    }

    const block = selectedBlocks[0];

    if (block.type === "table") {
      return getMergeDirection(editor, block);
    }

    return undefined;
  }, [editor, selectedBlocks]);

  const onClick = useCallback(() => {
    editor.tableHandles?.mergeCells();
  }, [editor]);

  if (!editor.isEditable || mergeDirection === undefined) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      label={dict.formatting_toolbar.table_cell_merge.tooltip}
      mainTooltip={dict.formatting_toolbar.table_cell_merge.tooltip}
      icon={
        mergeDirection === "horizontal" ? (
          <RiMergeCellsHorizontal />
        ) : (
          <RiMergeCellsVertical />
        )
      }
      onClick={onClick}
    />
  );
};
