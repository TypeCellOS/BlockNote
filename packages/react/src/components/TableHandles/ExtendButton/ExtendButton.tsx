import {
  EMPTY_CELL_HEIGHT,
  EMPTY_CELL_WIDTH,
  mergeCSSClasses,
  PartialTableContent,
} from "@blocknote/core";
import { TableHandlesExtension } from "@blocknote/core/extensions";
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
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import {
  useExtension,
  useExtensionState,
} from "../../../hooks/useExtension.js";
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

export const ExtendButton = (
  props: ExtendButtonProps & { children?: ReactNode },
) => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<any, any, any>();

  const tableHandles = useExtension(TableHandlesExtension);
  const block = useExtensionState(TableHandlesExtension, {
    selector: (state) => state?.block,
  });

  // needs to be a ref because it's used immediately in the onClick handler
  // (state would be async and only have effect after the next render
  const movedMouse = useRef(false);

  const [editingState, setEditingState] = useState<
    | {
        originalContent: PartialTableContent<any, any>;
        originalCroppedContent: PartialTableContent<any, any>;
        startPos: number;
      }
    | undefined
  >();

  // Lets the user start extending columns/rows by moving the mouse.
  const mouseDownHandler = useCallback(
    (event: ReactMouseEvent) => {
      tableHandles.freezeHandles();
      props.hideOtherElements(true);

      if (!block) {
        return;
      }

      setEditingState({
        originalContent: block.content as any,
        originalCroppedContent: {
          rows: tableHandles.cropEmptyRowsOrColumns(
            block,
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
    [block, props, tableHandles],
  );

  const onClickHandler = useCallback(() => {
    if (!block || movedMouse.current) {
      return;
    }

    editor.updateBlock(block, {
      type: "table",
      content: {
        ...block.content,
        rows:
          props.orientation === "addOrRemoveColumns"
            ? tableHandles.addRowsOrColumns(block, "columns", 1)
            : tableHandles.addRowsOrColumns(block, "rows", 1),
      } as any,
    });
  }, [block, editor, props.orientation, tableHandles]);

  // Extends columns/rows on when moving the mouse.
  useEffect(() => {
    const callback = (event: MouseEvent) => {
      if (!block) {
        return;
      }

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
          ? block.content.rows[0].cells.length
          : block.content.rows.length;

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
        editor.updateBlock(block, {
          type: "table",
          content: {
            ...block.content,
            rows:
              props.orientation === "addOrRemoveColumns"
                ? tableHandles.addRowsOrColumns(
                    {
                      type: "table",
                      content: editingState.originalCroppedContent,
                    } as any,
                    "columns",
                    newNumCells - numCroppedCells,
                  )
                : tableHandles.addRowsOrColumns(
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
        if (block.content) {
          editor.setTextCursorPosition(block);
        }
      }
    };

    if (editingState) {
      window.addEventListener("mousemove", callback);
    }

    return () => {
      window.removeEventListener("mousemove", callback);
    };
  }, [block, editingState, editor, props.orientation, tableHandles]);

  // Stops mouse movements from extending columns/rows when the mouse is
  // released. Also extends columns/rows by 1 if the mouse wasn't moved enough
  // to add any, imitating a click.
  useEffect(() => {
    const callback = () => {
      props.hideOtherElements(false);
      tableHandles.unfreezeHandles();
      setEditingState(undefined);
    };

    if (editingState) {
      window.addEventListener("mouseup", callback);
    }

    return () => {
      window.removeEventListener("mouseup", callback);
    };
  }, [editingState, props, tableHandles]);

  if (!editor.isEditable) {
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
