import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  PartialTableContent,
  StyleSchema,
} from "@blocknote/core";
import { MouseEvent as ReactMouseEvent, useEffect, useState } from "react";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { TableHandleProps } from "../TableHandleProps.js";

const getContentWithAddedRows = <
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  content: PartialTableContent<I, S>,
  rowsToAdd = 1
): PartialTableContent<I, S> => {
  const newRow: PartialTableContent<I, S>["rows"][number] = {
    cells: content.rows[0].cells.map(() => []),
  };
  const newRows: PartialTableContent<I, S>["rows"] = [];
  for (let i = 0; i < rowsToAdd; i++) {
    newRows.push(newRow);
  }

  return {
    type: "tableContent",
    columnWidths: content.columnWidths
      ? [...content.columnWidths, ...newRows.map(() => undefined)]
      : undefined,
    rows: [...content.rows, ...newRows],
  };
};

const getContentWithAddedCols = <
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  content: PartialTableContent<I, S>,
  colsToAdd = 1
): PartialTableContent<I, S> => {
  const newCell: PartialTableContent<I, S>["rows"][number]["cells"][number] =
    [];
  const newCells: PartialTableContent<I, S>["rows"][number]["cells"] = [];
  for (let i = 0; i < colsToAdd; i++) {
    newCells.push(newCell);
  }

  return {
    type: "tableContent",
    columnWidths: content.columnWidths || undefined,
    rows: content.rows.map((row) => ({
      cells: [...row.cells, ...newCells],
    })),
  };
};

export const ExtendButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: Pick<
    TableHandleProps<I, S>,
    "block" | "editor" | "orientation" | "freezeHandles" | "unfreezeHandles"
  >
) => {
  const Components = useComponentsContext()!;

  const [editingState, setEditingState] = useState<{
    startPos: number;
    numOriginalCells: number;
    clickOnly: boolean;
  } | null>(null);

  const mouseDownHandler = (event: ReactMouseEvent) => {
    props.freezeHandles();
    setEditingState({
      startPos: props.orientation === "row" ? event.clientX : event.clientY,
      numOriginalCells:
        props.orientation === "row"
          ? props.block.content.rows[0].cells.length
          : props.block.content.rows.length,
      clickOnly: true,
    });
  };

  // Extends columns/rows on when moving the mouse.
  useEffect(() => {
    const callback = (event: MouseEvent) => {
      if (editingState === null) {
        return;
      }

      const diff =
        (props.orientation === "row" ? event.clientX : event.clientY) -
        editingState.startPos;

      const numCells =
        editingState.numOriginalCells +
        Math.floor(diff / (props.orientation === "row" ? 100 : 31));
      const block = props.editor.getBlock(props.block)!;
      const numCurrentCells =
        props.orientation === "row"
          ? block.content.rows[0].cells.length
          : block.content.rows.length;

      if (
        editingState.numOriginalCells <= numCells &&
        numCells !== numCurrentCells
      ) {
        props.editor.updateBlock(props.block, {
          type: "table",
          content:
            props.orientation === "row"
              ? getContentWithAddedCols(
                  props.block.content,
                  numCells - editingState.numOriginalCells
                )
              : getContentWithAddedRows(
                  props.block.content,
                  numCells - editingState.numOriginalCells
                ),
        });
        // Edge case for updating block content as `updateBlock` causes the
        // selection to move into the next block, so we have to set it back.
        if (block.content) {
          props.editor.setTextCursorPosition(props.block);
        }
        setEditingState({ ...editingState, clickOnly: false });
      }
    };

    document.body.addEventListener("mousemove", callback);

    return () => {
      document.body.removeEventListener("mousemove", callback);
    };
  }, [editingState, props.block, props.editor, props.orientation]);

  // Stops mouse movements from extending columns/rows when the mouse is
  // released. Also extends columns/rows by 1 if the mouse wasn't moved enough
  // to add any, imitating a click.
  useEffect(() => {
    const callback = () => {
      if (editingState?.clickOnly) {
        props.editor.updateBlock(props.block, {
          type: "table",
          content:
            props.orientation === "row"
              ? getContentWithAddedCols(props.block.content)
              : getContentWithAddedRows(props.block.content),
        });
      }

      setEditingState(null);
      props.unfreezeHandles();
    };

    document.body.addEventListener("mouseup", callback);

    return () => {
      document.body.removeEventListener("mouseup", callback);
    };
  }, [
    editingState?.clickOnly,
    getContentWithAddedCols,
    getContentWithAddedRows,
    props,
  ]);

  return (
    <Components.TableHandle.ExtendButton
      onDragStart={(event) => {
        event.preventDefault();
      }}
      onMouseDown={mouseDownHandler}
    />
  );
};
