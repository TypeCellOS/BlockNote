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

export const ExtendButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  props: ExtendButtonProps<I, S> & { children?: ReactNode },
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
        originalCroppedContent: {
          rows: props.editor.tableHandles!.cropEmptyRowsOrColumns(
            props.block,
            props.orientation === "addOrRemoveColumns" ? "columns" : "rows",
          ),
        } as PartialTableContent<any, any>,
        startPos:
          props.orientation === "addOrRemoveColumns"
            ? event.clientX
            : event.clientY,
      });
      movedMouse.current = false;

      // preventdefault, otherwise text in the table might be selected
      event.preventDefault();
    },
    [props],
  );

  const onClickHandler = useCallback(() => {
    if (movedMouse.current) {
      return;
    }
    props.editor.updateBlock(props.block, {
      type: "table",
      content: {
        ...props.block.content,
        rows:
          props.orientation === "addOrRemoveColumns"
            ? props.editor.tableHandles!.addRowsOrColumns(
                props.block,
                "columns",
                1,
              )
            : props.editor.tableHandles!.addRowsOrColumns(
                props.block,
                "rows",
                1,
              ),
      } as any,
    });
  }, [props.block, props.orientation, props.editor]);

  // Extends columns/rows on when moving the mouse.
  useEffect(() => {
    const callback = (event: MouseEvent) => {
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
          ? (editingState.originalCroppedContent.rows[0]?.cells.length ?? 0)
          : editingState.originalCroppedContent.rows.length;

      const numOriginalCells =
        props.orientation === "addOrRemoveColumns"
          ? (editingState.originalContent.rows[0]?.cells.length ?? 0)
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
          0.3,
        );

      if (
        newNumCells >= numCroppedCells &&
        newNumCells > 0 &&
        newNumCells !== currentNumCells
      ) {
        props.editor.updateBlock(props.block, {
          type: "table",
          content: {
            ...props.block.content,
            rows:
              props.orientation === "addOrRemoveColumns"
                ? props.editor.tableHandles!.addRowsOrColumns(
                    {
                      type: "table",
                      content: editingState.originalCroppedContent,
                    } as any,
                    "columns",
                    newNumCells - numCroppedCells,
                  )
                : props.editor.tableHandles!.addRowsOrColumns(
                    {
                      type: "table",
                      content: editingState.originalCroppedContent,
                    } as any,
                    "rows",
                    newNumCells - numCroppedCells,
                  ),
          } as any,
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

  if (!props.editor.isEditable) {
    return null;
  }

  return (
    <Components.TableHandle.ExtendButton
      className={mergeCSSClasses(
        "bn-extend-button",
        props.orientation === "addOrRemoveColumns"
          ? "bn-extend-button-add-remove-columns"
          : "bn-extend-button-add-remove-rows",
        editingState !== null ? "bn-extend-button-editing" : "",
      )}
      onClick={onClickHandler}
      onMouseDown={mouseDownHandler}
    >
      {props.children || <RiAddFill size={18} data-test={"extendButton"} />}
    </Components.TableHandle.ExtendButton>
  );
};
