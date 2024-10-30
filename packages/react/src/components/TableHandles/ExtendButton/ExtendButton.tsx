import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  EMPTY_CELL_HEIGHT,
  EMPTY_CELL_WIDTH,
  InlineContentSchema,
  mergeCSSClasses,
  PartialTableContent,
  StyleSchema,
} from "@blocknote/core";
import {
  MouseEvent as ReactMouseEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { RiAddFill } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { ExtendButtonProps } from "./ExtendButtonProps.js";

function cropEmptyRowsOrColumns<
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  content: PartialTableContent<I, S>,
  removeEmpty: "columns" | "rows"
): PartialTableContent<I, S> {
  let emptyColsOnRight = 0;

  if (removeEmpty === "columns") {
    // strips empty columns to the right and empty rows at the bottom
    for (let i = content.rows[0].cells.length - 1; i >= 0; i--) {
      const isEmpty = content.rows.every((row) => row.cells[i].length === 0);
      if (!isEmpty) {
        break;
      }

      emptyColsOnRight++;
    }
  }

  const rows: PartialTableContent<I, S>["rows"] = [];
  for (let i = content.rows.length - 1; i >= 0; i--) {
    if (removeEmpty === "rows") {
      if (
        rows.length === 0 &&
        content.rows[i].cells.every((cell) => cell.length === 0)
      ) {
        // empty row at bottom
        continue;
      }
    }

    rows.unshift({
      cells: content.rows[i].cells.slice(
        0,
        content.rows[0].cells.length - emptyColsOnRight
      ),
    });
  }

  return {
    ...content,
    rows,
  };
}
// Rounds a number up or down, depending on whether we're close (as defined by
// `margin`) to the next integer.
const marginRound = (num: number, margin = 0.3) => {
  const lowerBound = Math.floor(num) + margin;
  const upperBound = Math.ceil(num) - margin;

  if (num >= lowerBound && num <= upperBound) {
    return Math.round(num);
  } else if (num < lowerBound) {
    return Math.floor(num);
  } else {
    return Math.ceil(num);
  }
};

const getContentWithAddedRows = <
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  content: PartialTableContent<I, S>,
  rowsToAdd: number,
  numCols: number
): PartialTableContent<I, S> => {
  const newRow: PartialTableContent<I, S>["rows"][number] = {
    cells: Array(numCols).fill([]),
  };

  const newRows: PartialTableContent<I, S>["rows"] = [];
  for (let i = 0; i < rowsToAdd; i++) {
    newRows.push(newRow);
  }
  return {
    type: "tableContent",
    columnWidths: content.columnWidths,
    rows: [...content.rows, ...newRows],
  };
};

const getContentWithAddedCols = <
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  content: PartialTableContent<I, S>,
  colsToAdd: number
): PartialTableContent<I, S> => {
  const newCell: PartialTableContent<I, S>["rows"][number]["cells"][number] =
    [];
  const newCells: PartialTableContent<I, S>["rows"][number]["cells"] = [];
  for (let i = 0; i < colsToAdd; i++) {
    newCells.push(newCell);
  }

  return {
    type: "tableContent",
    columnWidths: content.columnWidths
      ? [...content.columnWidths, ...newCells.map(() => undefined)]
      : undefined,
    rows: content.rows.map((row) => ({
      cells: [...row.cells, ...newCells],
    })),
  };
};

export const ExtendButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: ExtendButtonProps<I, S> & { children?: ReactNode }
) => {
  const Components = useComponentsContext()!;

  // needs to be a ref because it's used immediately in the onClick handler
  // (state would be async and only have effect after the next render
  const movedMouse = useRef(false);

  const [editingState, setEditingState] = useState<
    | {
        originalContent: PartialTableContent<I, S>;
        originalCroppedContent: PartialTableContent<I, S>;
        startPos: number;
      }
    | undefined
  >();

  // Lets the user start extending columns/rows by moving the mouse.
  const mouseDownHandler = useCallback(
    (event: ReactMouseEvent) => {
      props.onMouseDown();
      setEditingState({
        originalContent: props.block.content,
        originalCroppedContent: cropEmptyRowsOrColumns(
          props.block.content,
          props.orientation === "addOrRemoveColumns" ? "columns" : "rows"
        ),
        startPos:
          props.orientation === "addOrRemoveColumns"
            ? event.clientX
            : event.clientY,
      });
      movedMouse.current = false;

      // preventdefault, otherwise text in the table might be selected
      event.preventDefault();
    },
    [props]
  );

  const onClickHandler = useCallback(() => {
    if (movedMouse.current) {
      return;
    }
    props.editor.updateBlock(props.block, {
      type: "table",
      content:
        props.orientation === "addOrRemoveColumns"
          ? getContentWithAddedCols(props.block.content, 1)
          : getContentWithAddedRows(
              props.block.content,
              1,
              props.block.content.rows[0].cells.length
            ),
    });
  }, [props.block, props.orientation, props.editor]);

  // Extends columns/rows on when moving the mouse.
  useEffect(() => {
    const callback = (event: MouseEvent) => {
      // console.log("callback", event);
      if (!editingState) {
        throw new Error("editingState is undefined");
      }

      movedMouse.current = true;

      const diff =
        (props.orientation === "addOrRemoveColumns"
          ? event.clientX
          : event.clientY) - editingState.startPos;

      const numCroppedCells =
        props.orientation === "addOrRemoveColumns"
          ? editingState.originalCroppedContent.rows[0]?.cells.length ?? 0
          : editingState.originalCroppedContent.rows.length;

      const numOriginalCells =
        props.orientation === "addOrRemoveColumns"
          ? editingState.originalContent.rows[0]?.cells.length ?? 0
          : editingState.originalContent.rows.length;

      const currentNumCells =
        props.orientation === "addOrRemoveColumns"
          ? props.block.content.rows[0].cells.length
          : props.block.content.rows.length;

      const newNumCells =
        numOriginalCells +
        marginRound(
          diff /
            (props.orientation === "addOrRemoveColumns"
              ? EMPTY_CELL_WIDTH
              : EMPTY_CELL_HEIGHT),
          0.3
        );

      if (
        newNumCells >= numCroppedCells &&
        newNumCells > 0 &&
        newNumCells !== currentNumCells
      ) {
        props.editor.updateBlock(props.block, {
          type: "table",
          content:
            props.orientation === "addOrRemoveColumns"
              ? getContentWithAddedCols(
                  editingState.originalCroppedContent,
                  newNumCells - numCroppedCells
                )
              : getContentWithAddedRows(
                  editingState.originalCroppedContent,
                  newNumCells - numCroppedCells,
                  editingState.originalContent.rows[0].cells.length
                ),
        });

        // Edge case for updating block content as `updateBlock` causes the
        // selection to move into the next block, so we have to set it back.
        if (props.block.content) {
          props.editor.setTextCursorPosition(props.block);
        }
      }
    };

    if (editingState) {
      window.addEventListener("mousemove", callback);
    }
    return () => {
      window.removeEventListener("mousemove", callback);
    };
  }, [editingState, props.block, props.editor, props.orientation]);

  // Stops mouse movements from extending columns/rows when the mouse is
  // released. Also extends columns/rows by 1 if the mouse wasn't moved enough
  // to add any, imitating a click.
  useEffect(() => {
    const onMouseUp = props.onMouseUp;

    const callback = () => {
      setEditingState(undefined);
      onMouseUp();
    };

    if (editingState) {
      window.addEventListener("mouseup", callback);
    }

    return () => {
      window.removeEventListener("mouseup", callback);
    };
  }, [editingState, props.onMouseUp]);

  return (
    <Components.TableHandle.ExtendButton
      className={mergeCSSClasses(
        "bn-extend-button",
        props.orientation === "addOrRemoveColumns"
          ? "bn-extend-button-add-remove-columns"
          : "bn-extend-button-add-remove-rows",
        editingState !== null ? "bn-extend-button-editing" : ""
      )}
      onClick={onClickHandler}
      onMouseDown={mouseDownHandler}>
      {props.children || <RiAddFill size={18} data-test={"extendButton"} />}
    </Components.TableHandle.ExtendButton>
  );
};
