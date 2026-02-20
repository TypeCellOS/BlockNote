import {
  BlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  getNodeById,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { TableHandlesExtension } from "@blocknote/core/extensions";
import { FC, useMemo, useState } from "react";

import { offset, size } from "@floating-ui/react";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useExtensionState } from "../../hooks/useExtension.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import {
  GenericPopover,
  GenericPopoverReference,
} from "../Popovers/GenericPopover.js";
import { ExtendButton } from "./ExtendButton/ExtendButton.js";
import { ExtendButtonProps } from "./ExtendButton/ExtendButtonProps.js";
import { TableHandle } from "./TableHandle.js";
import { TableCellButton } from "./TableCellButton.js";
import { TableCellButtonProps } from "./TableCellButtonProps.js";
import { TableHandleProps } from "./TableHandleProps.js";

export const TableHandlesController = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(props: {
  tableCellHandle?: FC<TableCellButtonProps>;
  tableHandle?: FC<TableHandleProps>;
  extendButton?: FC<ExtendButtonProps>;
}) => {
  const editor = useBlockNoteEditor<BlockSchema, I, S>();

  const [onlyShownElement, setOnlyShownElement] = useState<
    | "rowTableHandle"
    | "columnTableHandle"
    | "tableCellHandle"
    | "extendRowsButton"
    | "extendColumnsButton"
    | undefined
  >();

  const state = useExtensionState(TableHandlesExtension);

  const references = useMemo<{
    tableReference?: GenericPopoverReference;
    cellReference?: GenericPopoverReference;
    rowReference?: GenericPopoverReference;
    columnReference?: GenericPopoverReference;
  }>(() => {
    const references: {
      tableReference?: GenericPopoverReference;
      cellReference?: GenericPopoverReference;
      rowReference?: GenericPopoverReference;
      columnReference?: GenericPopoverReference;
    } = {};

    if (state === undefined) {
      return {};
    }

    // TODO use the location API for this
    const nodePosInfo = getNodeById(
      state.block.id,
      editor.prosemirrorState.doc,
    );
    if (!nodePosInfo) {
      return {};
    }

    const tableBeforePos = nodePosInfo.posBeforeNode + 1;

    const tableElement = editor.prosemirrorView.domAtPos(
      tableBeforePos + 1,
    ).node;
    if (!(tableElement instanceof Element)) {
      return {};
    }

    references.tableReference = { element: tableElement };

    if (state.rowIndex === undefined || state.colIndex === undefined) {
      return references;
    }

    const rowBeforePos = editor.prosemirrorState.doc
      .resolve(tableBeforePos + 1)
      .posAtIndex(state.rowIndex);
    const cellBeforePos = editor.prosemirrorState.doc
      .resolve(rowBeforePos + 1)
      .posAtIndex(state.colIndex);

    const cellElement = editor.prosemirrorView.domAtPos(cellBeforePos + 1).node;
    if (!(cellElement instanceof Element)) {
      return {};
    }

    references.cellReference = { element: cellElement };
    references.rowReference = {
      element: tableElement,
      getBoundingClientRect: () => {
        const tableBoundingRect = tableElement.getBoundingClientRect();
        const cellBoundingRect = cellElement.getBoundingClientRect();

        return new DOMRect(
          tableBoundingRect.x,
          state.draggingState &&
          state.draggingState.draggedCellOrientation === "row"
            ? state.draggingState.mousePos - cellBoundingRect.height / 2
            : cellBoundingRect.y,
          tableBoundingRect.width,
          cellBoundingRect.height,
        );
      },
    };
    references.columnReference = {
      element: tableElement,
      getBoundingClientRect: () => {
        const tableBoundingRect = tableElement.getBoundingClientRect();
        const cellBoundingRect = cellElement.getBoundingClientRect();

        return new DOMRect(
          state.draggingState &&
          state.draggingState.draggedCellOrientation === "col"
            ? state.draggingState.mousePos - cellBoundingRect.width / 2
            : cellBoundingRect.x,
          tableBoundingRect.y,
          cellBoundingRect.width,
          tableBoundingRect.height,
        );
      },
    };

    return references;
  }, [editor, state]);

  const floatingUIOptions = useMemo<
    | {
        rowTableHandle: FloatingUIOptions;
        columnTableHandle: FloatingUIOptions;
        tableCellHandle: FloatingUIOptions;
        extendRowsButton: FloatingUIOptions;
        extendColumnsButton: FloatingUIOptions;
      }
    | undefined
  >(
    () =>
      state !== undefined
        ? {
            rowTableHandle: {
              useFloatingOptions: {
                open:
                  state.show &&
                  state.rowIndex !== undefined &&
                  (!onlyShownElement || onlyShownElement === "rowTableHandle"),
                placement: "left",
                middleware: [offset(-10)],
              },
              elementProps: {
                style: {
                  zIndex: 10,
                },
              },
            },
            columnTableHandle: {
              useFloatingOptions: {
                open:
                  state.show &&
                  state.colIndex !== undefined &&
                  (!onlyShownElement ||
                    onlyShownElement === "columnTableHandle"),
                placement: "top",
                middleware: [offset(-12)],
              },
              elementProps: {
                style: {
                  zIndex: 10,
                },
              },
            },
            tableCellHandle: {
              useFloatingOptions: {
                open:
                  state.show &&
                  state.rowIndex !== undefined &&
                  state.colIndex !== undefined &&
                  (!onlyShownElement || onlyShownElement === "tableCellHandle"),
                placement: "top-end",
                middleware: [offset({ mainAxis: -15, crossAxis: -1 })],
              },
              elementProps: {
                style: {
                  zIndex: 10,
                },
              },
            },
            extendRowsButton: {
              useFloatingOptions: {
                open:
                  state.show &&
                  state.showAddOrRemoveRowsButton &&
                  (!onlyShownElement ||
                    onlyShownElement === "extendRowsButton"),
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
              },
              elementProps: {
                style: {
                  zIndex: 10,
                },
              },
            },
            extendColumnsButton: {
              useFloatingOptions: {
                open:
                  state.show &&
                  state.showAddOrRemoveColumnsButton &&
                  (!onlyShownElement ||
                    onlyShownElement === "extendColumnsButton"),
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
              },
              elementProps: {
                style: {
                  zIndex: 10,
                },
              },
            },
          }
        : undefined,
    [onlyShownElement, state],
  );

  if (!state) {
    return null;
  }

  const TableHandleComponent = props.tableHandle || TableHandle;
  const ExtendButtonComponent = props.extendButton || ExtendButton;
  const TableCellHandleComponent = props.tableCellHandle || TableCellButton;

  return (
    <>
      <GenericPopover
        reference={references?.rowReference}
        {...floatingUIOptions?.rowTableHandle}
      >
        {state.show &&
          state.rowIndex !== undefined &&
          (!onlyShownElement || onlyShownElement === "rowTableHandle") && (
            <TableHandleComponent
              orientation="row"
              hideOtherElements={(hide) =>
                setOnlyShownElement(hide ? "rowTableHandle" : undefined)
              }
            />
          )}
      </GenericPopover>
      <GenericPopover
        reference={references?.columnReference}
        {...floatingUIOptions?.columnTableHandle}
      >
        {state.show &&
          state.colIndex !== undefined &&
          (!onlyShownElement || onlyShownElement === "columnTableHandle") && (
            <TableHandleComponent
              orientation="column"
              hideOtherElements={(hide) =>
                setOnlyShownElement(hide ? "columnTableHandle" : undefined)
              }
            />
          )}
      </GenericPopover>
      <GenericPopover
        reference={references?.cellReference}
        {...floatingUIOptions?.tableCellHandle}
      >
        {state.show &&
          state.rowIndex !== undefined &&
          state.colIndex !== undefined &&
          (!onlyShownElement || onlyShownElement === "tableCellHandle") && (
            <TableCellHandleComponent
              hideOtherElements={(hide) =>
                setOnlyShownElement(hide ? "tableCellHandle" : undefined)
              }
            />
          )}
      </GenericPopover>
      <GenericPopover
        reference={references?.tableReference}
        {...floatingUIOptions?.extendRowsButton}
      >
        {state.show &&
          state.showAddOrRemoveRowsButton &&
          (!onlyShownElement || onlyShownElement === "extendRowsButton") && (
            <ExtendButtonComponent
              orientation="addOrRemoveRows"
              hideOtherElements={(hide) =>
                setOnlyShownElement(hide ? "extendRowsButton" : undefined)
              }
            />
          )}
      </GenericPopover>
      <GenericPopover
        reference={references?.tableReference}
        {...floatingUIOptions?.extendColumnsButton}
      >
        {state.show &&
          state.showAddOrRemoveColumnsButton &&
          (!onlyShownElement || onlyShownElement === "extendColumnsButton") && (
            <ExtendButtonComponent
              orientation="addOrRemoveColumns"
              hideOtherElements={(hide) =>
                setOnlyShownElement(hide ? "extendColumnsButton" : undefined)
              }
            />
          )}
      </GenericPopover>
    </>
  );
};
