import {
  BlockFromConfigNoChildren,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
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
  useState,
} from "react";
import { RiAddFill } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { ExtendButtonProps } from "./ExtendButtonProps.js";

// Rounds a number up or down, depending on whether the value past the decimal
// point is above or below a certain fraction. If no fraction is provided, it
// behaves like Math.round.
const roundUpAt = (num: number, fraction = 0.5) => {
  if (fraction <= 0 || fraction >= 100) {
    throw new Error("Percentage must be between 0 and 1");
  }

  if (num < fraction) {
    return Math.floor(num);
  }

  return Math.ceil(num);
};

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
    columnWidths: content.columnWidths,
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

  const [editingState, setEditingState] = useState<{
    originalBlock: BlockFromConfigNoChildren<DefaultBlockSchema["table"], I, S>;
    startPos: number;
    clickOnly: boolean;
  } | null>(null);

  // Lets the user start extending columns/rows by moving the mouse.
  const mouseDownHandler = useCallback(
    (event: ReactMouseEvent) => {
      props.freezeHandles();
      setEditingState({
        originalBlock: props.block,
        startPos: props.orientation === "row" ? event.clientX : event.clientY,
        clickOnly: true,
      });
    },
    [props]
  );

  // Extends columns/rows on when moving the mouse.
  useEffect(() => {
    const callback = (event: MouseEvent) => {
      if (editingState === null) {
        return;
      }

      const diff =
        (props.orientation === "row" ? event.clientX : event.clientY) -
        editingState.startPos;

      const numOriginalCells =
        props.orientation === "row"
          ? editingState.originalBlock.content.rows[0].cells.length
          : editingState.originalBlock.content.rows.length;
      const oldNumCells =
        props.orientation === "row"
          ? props.block.content.rows[0].cells.length
          : props.block.content.rows.length;
      const newNumCells =
        numOriginalCells +
        roundUpAt(diff / (props.orientation === "row" ? 100 : 31), 0.3);

      if (numOriginalCells <= newNumCells && newNumCells !== oldNumCells) {
        props.editor.updateBlock(props.block, {
          type: "table",
          content:
            props.orientation === "row"
              ? getContentWithAddedCols(
                  editingState.originalBlock.content,
                  newNumCells - numOriginalCells
                )
              : getContentWithAddedRows(
                  editingState.originalBlock.content,
                  newNumCells - numOriginalCells
                ),
        });

        // Edge case for updating block content as `updateBlock` causes the
        // selection to move into the next block, so we have to set it back.
        if (editingState.originalBlock.content) {
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
              ? getContentWithAddedCols(editingState.originalBlock.content)
              : getContentWithAddedRows(editingState.originalBlock.content),
        });
      }

      setEditingState(null);
      props.unfreezeHandles();
    };

    document.body.addEventListener("mouseup", callback);

    return () => {
      document.body.removeEventListener("mouseup", callback);
    };
  }, [editingState?.clickOnly, editingState?.originalBlock.content, props]);

  return (
    <Components.TableHandle.ExtendButton
      className={mergeCSSClasses(
        "bn-extend-button",
        props.orientation === "row"
          ? "bn-extend-button-row"
          : "bn-extend-button-column",
        editingState !== null ? "bn-extend-button-editing" : ""
      )}
      onDragStart={(event) => {
        event.preventDefault();
      }}
      onMouseDown={mouseDownHandler}>
      {props.children || <RiAddFill size={18} data-test={"extendButton"} />}
    </Components.TableHandle.ExtendButton>
  );
};
