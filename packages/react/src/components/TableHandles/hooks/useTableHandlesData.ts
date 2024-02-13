import {
  BlockFromConfigNoChildren,
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
  TableHandlesData,
} from "@blocknote/core";
import { useEffect, useState } from "react";
import { UiComponentData } from "../../../components-shared/UiComponentTypes";

export function useTableHandlesData<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>
): UiComponentData<TableHandlesData<I, S>, "tableHandles"> {
  const [block, setBlock] =
    useState<BlockFromConfigNoChildren<DefaultBlockSchema["table"], I, S>>();
  const [rowIndex, setRowIndex] = useState<number>();
  const [colIndex, setColIndex] = useState<number>();
  const [draggedCellOrientation, setDraggedCellOrientation] = useState<
    "row" | "col" | undefined
  >(undefined);

  useEffect(() => {
    return editor.tableHandles!.onDataUpdate((data) => {
      setBlock(data.block);
      setRowIndex(data.rowIndex);
      setColIndex(data.colIndex);

      if (data.draggingState) {
        setDraggedCellOrientation(data.draggingState.draggedCellOrientation);
      } else {
        setDraggedCellOrientation(undefined);
      }
    });
  }, [editor]);

  return {
    block: block!,
    rowIndex: rowIndex!,
    colIndex: colIndex!,
    draggingState: draggedCellOrientation,
    rowDragStart: editor.tableHandles!.rowDragStart,
    colDragStart: editor.tableHandles!.colDragStart,
    dragEnd: editor.tableHandles!.dragEnd,
    freezeHandles: editor.tableHandles!.freezeHandles,
    unfreezeHandles: editor.tableHandles!.unfreezeHandles,
  } as any;
}
