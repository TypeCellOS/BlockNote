import {
  DefaultBlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useMemo } from "react";
import { RiMergeCellsHorizontal, RiMergeCellsVertical } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks.js";
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

  const selectedBlocks = useSelectedBlocks(editor);
  const mergeDirection = useMemo(() => {
    // Checks if only one block is selected.
    if (selectedBlocks.length !== 1) {
      return undefined;
    }

    const block = selectedBlocks[0];

    if (block.type === "table") {
      return editor.tableHandles?.getMergeDirection(block);
    }

    return undefined;
  }, [editor, selectedBlocks]);

  const onClick = useCallback(() => {
    editor.tableHandles?.mergeCells();
  }, [editor]);

  if (
    !editor.isEditable ||
    mergeDirection === undefined ||
    !editor.settings.tables.splitCells
  ) {
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
