import {
  BlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { FC, useMemo, useState } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useExtendButtonsPositioning } from "./hooks/useExtendButtonsPositioning.js";
import { useTableHandlesPositioning } from "./hooks/useTableHandlesPositioning.js";
import { useUIPluginState } from "../../hooks/useUIPluginState.js";
import { ExtendButton } from "./ExtendButton/ExtendButton.js";
import { TableHandle } from "./TableHandle.js";
import { TableHandleProps } from "./TableHandleProps.js";

export const TableHandlesController = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  tableHandle?: FC<TableHandleProps<I, S>>;
  extendButton?: FC<
    Pick<
      TableHandleProps<I, S>,
      "block" | "editor" | "orientation" | "freezeHandles" | "unfreezeHandles"
    >
  >;
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

  const draggingState = useMemo(() => {
    return state?.draggingState
      ? {
          draggedCellOrientation: state?.draggingState?.draggedCellOrientation,
          mousePos: state?.draggingState?.mousePos,
        }
      : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state?.draggingState,
    state?.draggingState?.draggedCellOrientation,
    state?.draggingState?.mousePos,
  ]);

  const { rowHandle, colHandle } = useTableHandlesPositioning(
    state?.show || false,
    state?.referencePosCell || null,
    state?.referencePosTable || null,
    draggingState
  );

  const { rowExtendButton, colExtendButton } = useExtendButtonsPositioning(
    state?.showExtendButtonRow || false,
    state?.showExtendButtonCol || false,
    state?.referencePosCell || null,
    state?.referencePosTable || null,
    draggingState
  );

  const [hideRow, setHideRow] = useState<boolean>(false);
  const [hideCol, setHideCol] = useState<boolean>(false);

  if (!rowHandle.isMounted || !colHandle.isMounted || !state) {
    return null;
  }

  const TableHandleComponent = props.tableHandle || TableHandle;
  const ExtendButtonComponent = props.extendButton || ExtendButton;

  return (
    <>
      {!hideRow && (
        <div ref={rowHandle.ref} style={rowHandle.style}>
          <TableHandleComponent
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
          <TableHandleComponent
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
      {!draggingState && !hideCol && !hideRow && (
        <>
          <div ref={rowExtendButton.ref} style={rowExtendButton.style}>
            <ExtendButtonComponent
              editor={editor as any}
              orientation={"row"}
              block={state.block}
              freezeHandles={callbacks.freezeHandles}
              unfreezeHandles={callbacks.unfreezeHandles}
            />
          </div>
          <div ref={colExtendButton.ref} style={colExtendButton.style}>
            <ExtendButtonComponent
              editor={editor as any}
              orientation={"column"}
              block={state.block}
              freezeHandles={callbacks.freezeHandles}
              unfreezeHandles={callbacks.unfreezeHandles}
            />
          </div>
        </>
      )}
    </>
  );
};
