import {
  BlockNoteEditor,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
  TableHandlesState,
} from "@blocknote/core";
import { DragEvent, FC, useState } from "react";

import { DragHandleMenuProps } from "../SideMenu/DragHandleMenu/DragHandleMenu";
import { useUIPluginState } from "../../hooks/useUIPluginState";
import { useTableHandlesPositioning } from "./hooks/useTableHandlesPositioning";
import { DefaultTableHandle } from "./DefaultTableHandle";
import { BlockSchemaWithTable } from "./BlockSchemaWithTable";

type NonUndefined<T> = T extends undefined ? never : T;

export type TableHandleProps<
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = {
  editor: BlockNoteEditor<BlockSchemaWithTable, I, S>;
  orientation: "row" | "column";
  index: number;
  dragStart: (e: DragEvent<HTMLDivElement>) => void;
  showOtherSide: () => void;
  hideOtherSide: () => void;
  tableHandleMenu?: FC<DragHandleMenuProps<BlockSchemaWithTable, I, S>>;
} & Pick<TableHandlesState<I, S>, "block"> &
  Pick<
    NonUndefined<BlockNoteEditor<BlockSchemaWithTable, I, S>["tableHandles"]>,
    "dragEnd" | "freezeHandles" | "unfreezeHandles"
  >;

export const DefaultPositionedTableHandles = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  editor: BlockNoteEditor<BlockSchemaWithTable, I, S>;
  tableHandle?: FC<TableHandleProps<I, S>>;
}) => {
  const callbacks = {
    rowDragStart: props.editor.tableHandles!.rowDragStart,
    colDragStart: props.editor.tableHandles!.colDragStart,
    dragEnd: props.editor.tableHandles!.dragEnd,
    freezeHandles: props.editor.tableHandles!.freezeHandles,
    unfreezeHandles: props.editor.tableHandles!.unfreezeHandles,
  };

  const state = useUIPluginState(
    props.editor.tableHandles!.onUpdate.bind(props.editor.tableHandles)
  );
  const { rowHandle, colHandle } = useTableHandlesPositioning(
    state?.show || false,
    state?.referencePosCell || null,
    state?.referencePosTable || null,
    state?.draggingState
      ? {
          draggedCellOrientation: state?.draggingState?.draggedCellOrientation,
          mousePos: state?.draggingState?.mousePos,
        }
      : undefined
  );
  console.log(state);
  console.log(rowHandle);
  console.log(colHandle);

  const [hideRow, setHideRow] = useState<boolean>(false);
  const [hideCol, setHideCol] = useState<boolean>(false);

  if (!rowHandle.isMounted || !colHandle.isMounted || !state) {
    return null;
  }

  const TableHandle = props.tableHandle || DefaultTableHandle;

  return (
    <>
      {!hideRow && (
        <div ref={rowHandle.ref} style={rowHandle.style}>
          <TableHandle
            // This "as any" unfortunately seems complicated to fix
            editor={props.editor as any}
            orientation={"row"}
            showOtherSide={() => setHideCol(false)}
            hideOtherSide={() => setHideCol(true)}
            index={state.rowIndex}
            block={state.block}
            dragStart={callbacks.rowDragStart}
            dragEnd={callbacks.dragEnd}
            freezeHandles={callbacks.freezeHandles}
            unfreezeHandles={callbacks.unfreezeHandles}
          />
        </div>
      )}
      {!hideCol && (
        <div ref={colHandle.ref} style={colHandle.style}>
          <TableHandle
            editor={props.editor as any}
            orientation={"column"}
            showOtherSide={() => setHideRow(false)}
            hideOtherSide={() => setHideRow(true)}
            index={state.colIndex}
            block={state.block}
            dragStart={callbacks.colDragStart}
            dragEnd={callbacks.dragEnd}
            freezeHandles={callbacks.freezeHandles}
            unfreezeHandles={callbacks.unfreezeHandles}
          />
        </div>
      )}
    </>
  );
};
