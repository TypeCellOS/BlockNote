import {
  BlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { FC, useState } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor";
import { useUIPluginState } from "../../hooks/useUIPluginState";
import { TableHandleProps } from "./TableHandleProps";
import { useTableHandlesPositioning } from "./hooks/useTableHandlesPositioning";
import { TableHandle } from "./mantine/TableHandle";

export const TableHandlesController = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  tableHandle?: FC<TableHandleProps<I, S>>;
}) => {
  const editor = useBlockNoteEditor<BlockSchema, I, S>();

  if (!editor.tableHandles) {
    throw new Error(
      "TableHandlesController can only be used when BlockNote editor schema contains table block"
    );
  }

  const callbacks = {
    rowDragStart: editor.tableHandles.rowDragStart,
    colDragStart: editor.tableHandles.colDragStart,
    dragEnd: editor.tableHandles.dragEnd,
    freezeHandles: editor.tableHandles.freezeHandles,
    unfreezeHandles: editor.tableHandles.unfreezeHandles,
  };

  const state = useUIPluginState(
    editor.tableHandles.onUpdate.bind(editor.tableHandles)
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

  const [hideRow, setHideRow] = useState<boolean>(false);
  const [hideCol, setHideCol] = useState<boolean>(false);

  if (!rowHandle.isMounted || !colHandle.isMounted || !state) {
    return null;
  }

  const Component = props.tableHandle || TableHandle;

  return (
    <>
      {!hideRow && (
        <div ref={rowHandle.ref} style={rowHandle.style}>
          <Component
            // This "as any" unfortunately seems complicated to fix
            editor={editor as any}
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
          <Component
            editor={editor as any}
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
