import {
  BlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  getNodeById,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { TableHandles } from "@blocknote/core/extensions";
import { FC, useMemo } from "react";

import { offset, size } from "@floating-ui/react";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { ExtendButton } from "./ExtendButton/ExtendButton.js";
import { ExtendButtonProps } from "./ExtendButton/ExtendButtonProps.js";
import { TableHandle } from "./TableHandle.js";
import { TableCellButton } from "./TableCellButton.js";
import { TableCellButtonProps } from "./TableCellButtonProps.js";
import { usePluginState } from "../../hooks/usePlugin.js";
import { TableCellPopover } from "../Popovers/TableCellPopover.js";
import { TableHandleProps } from "./TableHandleProps.js";
import { GenericPopover } from "../Popovers/GenericPopover.js";

export const TableHandlesController = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(props: {
  tableCellHandle?: FC<TableCellButtonProps>;
  tableHandle?: FC<TableHandleProps>;
  extendButton?: FC<ExtendButtonProps>;
}) => {
  const editor = useBlockNoteEditor<BlockSchema, I, S>();

  const state = usePluginState(TableHandles);

  const tableElement = useMemo(() => {
    if (state === undefined) {
      return undefined;
    }

    // TODO use the locatieon API for this
    const nodePosInfo = getNodeById(
      state.block.id,
      editor.prosemirrorState.doc,
    );
    if (!nodePosInfo) {
      return undefined;
    }

    const tableBeforePos = nodePosInfo.posBeforeNode + 1;

    const { node } = editor.prosemirrorView.domAtPos(tableBeforePos + 1);
    if (!(node instanceof Element)) {
      return undefined;
    }

    return node;
  }, [state, editor]);

  if (!state) {
    return null;
  }

  const TableHandleComponent = props.tableHandle || TableHandle;
  const ExtendButtonComponent = props.extendButton || ExtendButton;
  const TableCellHandleComponent = props.tableCellHandle || TableCellButton;

  return (
    <>
      <TableCellPopover
        blockId={state.block.id}
        colIndex={0}
        rowIndex={state.rowIndex}
        useFloatingOptions={{
          open: state.rowIndex !== undefined,
          placement: "left",
          middleware: [offset(-10)],
        }}
        elementProps={{
          style: {
            zIndex: 10,
          },
        }}
      >
        {state.rowIndex !== undefined && (
          <TableHandleComponent orientation="row" />
        )}
      </TableCellPopover>
      <TableCellPopover
        blockId={state.block.id}
        colIndex={state.colIndex}
        rowIndex={0}
        useFloatingOptions={{
          open: state.colIndex !== undefined,
          placement: "top",
          middleware: [offset(-12)],
        }}
        elementProps={{
          style: {
            zIndex: 10,
          },
        }}
      >
        {state.colIndex !== undefined && (
          <TableHandleComponent orientation="column" />
        )}
      </TableCellPopover>
      <TableCellPopover
        blockId={state.block.id}
        colIndex={state.colIndex}
        rowIndex={state.rowIndex}
        useFloatingOptions={{
          open: true,
          placement: "top-end",
          middleware: [offset({ mainAxis: -15, crossAxis: -1 })],
        }}
        elementProps={{
          style: {
            zIndex: 10,
          },
        }}
      >
        <TableCellHandleComponent />
      </TableCellPopover>
      <GenericPopover
        reference={tableElement}
        useFloatingOptions={{
          open: state.showAddOrRemoveRowsButton,
          placement: "bottom",
          middleware: [
            size({
              apply({ rects, elements }) {
                Object.assign(elements.floating.style, {
                  width: `${rects.reference.width}px`,
                });
              },
            }),
          ],
        }}
        elementProps={{
          style: {
            zIndex: 10,
          },
        }}
      >
        <ExtendButtonComponent orientation="addOrRemoveRows" />
      </GenericPopover>
      <GenericPopover
        reference={tableElement}
        useFloatingOptions={{
          open: state.showAddOrRemoveColumnsButton,
          placement: "right",
          middleware: [
            size({
              apply({ rects, elements }) {
                Object.assign(elements.floating.style, {
                  height: `${rects.reference.height}px`,
                });
              },
            }),
          ],
        }}
        elementProps={{
          style: {
            zIndex: 10,
          },
        }}
      >
        <ExtendButtonComponent orientation="addOrRemoveColumns" />
      </GenericPopover>
    </>
  );
};
