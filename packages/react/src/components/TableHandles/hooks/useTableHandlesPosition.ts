import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { UiComponentPosition } from "../../../components-shared/UiComponentTypes";
import { useEffect, useRef, useState } from "react";
import { offset, useFloating, useTransitionStyles } from "@floating-ui/react";

export function useTableHandlesPosition<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>
): {
  rowHandle: UiComponentPosition;
  colHandle: UiComponentPosition;
} {
  const [show, setShow] = useState<boolean>(false);

  const [draggedCellOrientation, setDraggedCellOrientation] = useState<
    "row" | "col" | undefined
  >(undefined);
  const [mousePos, setMousePos] = useState<number | undefined>();

  const [, setForceUpdate] = useState<number>(0);

  const referencePosCell = useRef<DOMRect>();
  const referencePosTable = useRef<DOMRect>();

  const rowFloating = useFloating({
    open: show,
    placement: "left",
    middleware: [offset(-10)],
  });
  const colFloating = useFloating({
    open: show,
    placement: "top",
    middleware: [offset(-12)],
  });

  const rowTransitionStyles = useTransitionStyles(rowFloating.context);
  const colTransitionStyles = useTransitionStyles(colFloating.context);

  useEffect(() => {
    return editor.tableHandles!.onPositionUpdate((position) => {
      // console.log("update", state.draggingState);
      setShow(position.show);
      setForceUpdate(Math.random());

      if (position.draggingState) {
        setDraggedCellOrientation(
          position.draggingState.draggedCellOrientation
        );
        setMousePos(position.draggingState.mousePos);
      } else {
        setDraggedCellOrientation(undefined);
        setMousePos(undefined);
      }

      referencePosCell.current = position.referencePosCell;
      referencePosTable.current = position.referencePosTable;
      rowFloating.update();
      colFloating.update();
    });
  }, [colFloating, editor.tableHandles, rowFloating]);

  useEffect(() => {
    rowFloating.refs.setReference({
      getBoundingClientRect: () => {
        if (draggedCellOrientation === "row") {
          return new DOMRect(
            referencePosTable.current!.x,
            mousePos!,
            referencePosTable.current!.width,
            0
          );
        }

        return new DOMRect(
          referencePosTable.current!.x,
          referencePosCell.current!.y,
          referencePosTable.current!.width,
          referencePosCell.current!.height
        );
      },
    });
  }, [draggedCellOrientation, mousePos, rowFloating.refs]);

  useEffect(() => {
    colFloating.refs.setReference({
      getBoundingClientRect: () => {
        if (draggedCellOrientation === "col") {
          return new DOMRect(
            mousePos!,
            referencePosTable.current!.y,
            0,
            referencePosTable.current!.height
          );
        }

        return new DOMRect(
          referencePosCell.current!.x,
          referencePosTable.current!.y,
          referencePosCell.current!.width,
          referencePosTable.current!.height
        );
      },
    });
  }, [colFloating.refs, draggedCellOrientation, mousePos]);

  return {
    rowHandle: {
      isMounted: rowTransitionStyles.isMounted,
      ref: rowFloating.refs.setFloating,
      style: {
        display: "flex",
        ...rowTransitionStyles.styles,
        ...rowFloating.floatingStyles,
        zIndex: 10000,
      },
    },
    colHandle: {
      isMounted: colTransitionStyles.isMounted,
      ref: colFloating.refs.setFloating,
      style: {
        display: "flex",
        ...colTransitionStyles.styles,
        ...colFloating.floatingStyles,
        zIndex: 10000,
      },
    },
  };
}
