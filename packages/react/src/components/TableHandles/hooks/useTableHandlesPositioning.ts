import { offset, useFloating, useTransitionStyles } from "@floating-ui/react";
import { useEffect, useMemo } from "react";

function getBoundingClientRectRow(
  referencePosCell: DOMRect | null,
  referencePosTable: DOMRect | null,
  draggingState?: {
    draggedCellOrientation: "row" | "col";
    mousePos: number;
  },
) {
  if (draggingState && draggingState.draggedCellOrientation === "row") {
    return new DOMRect(
      referencePosTable!.x,
      draggingState.mousePos,
      referencePosTable!.width,
      0,
    );
  }

  return new DOMRect(
    referencePosTable!.x,
    referencePosCell!.y,
    referencePosTable!.width,
    referencePosCell!.height,
  );
}

function getBoundingClientRectCol(
  referencePosCell: DOMRect | null,
  referencePosTable: DOMRect | null,
  draggingState?: {
    draggedCellOrientation: "row" | "col";
    mousePos: number;
  },
) {
  if (draggingState && draggingState.draggedCellOrientation === "col") {
    return new DOMRect(
      draggingState.mousePos,
      referencePosTable!.y,
      0,
      referencePosTable!.height,
    );
  }

  return new DOMRect(
    referencePosCell!.x,
    referencePosTable!.y,
    referencePosCell!.width,
    referencePosTable!.height,
  );
}

function getBoundingClientRectCell(referencePosCell: DOMRect | null) {
  return new DOMRect(
    referencePosCell!.x,
    referencePosCell!.y,
    referencePosCell!.width,
    0,
  );
}

function useTableHandlePosition(
  orientation: "row" | "col" | "cell",
  show: boolean,
  referencePosCell: DOMRect | null,
  referencePosTable: DOMRect | null,
  draggingState?: {
    draggedCellOrientation: "row" | "col";
    mousePos: number;
  },
): {
  isMounted: boolean;
  ref: (node: HTMLElement | null) => void;
  style: React.CSSProperties;
} {
  const { refs, update, context, floatingStyles } = useFloating({
    open: show,
    placement:
      orientation === "row"
        ? "left"
        : orientation === "col"
          ? "top"
          : "bottom-end",
    middleware: [
      offset(
        orientation === "row"
          ? -10
          : orientation === "col"
            ? -12
            : { mainAxis: 1, crossAxis: -1 },
      ),
    ],
  });

  const { isMounted, styles } = useTransitionStyles(context);

  useEffect(() => {
    update();
  }, [referencePosCell, referencePosTable, update]);

  useEffect(() => {
    // Will be null on initial render when used in UI component controllers.
    if (
      referencePosCell === null ||
      referencePosTable === null ||
      // Ignore cell handle when dragging
      (draggingState && orientation === "cell")
    ) {
      return;
    }

    refs.setReference({
      getBoundingClientRect: () => {
        const fn =
          orientation === "row"
            ? getBoundingClientRectRow
            : orientation === "col"
              ? getBoundingClientRectCol
              : getBoundingClientRectCell;
        return fn(referencePosCell, referencePosTable, draggingState);
      },
    });
  }, [draggingState, orientation, referencePosCell, referencePosTable, refs]);

  return useMemo(
    () => ({
      isMounted: isMounted,
      ref: refs.setFloating,
      style: {
        display: "flex",
        ...styles,
        ...floatingStyles,
      },
    }),
    [floatingStyles, isMounted, refs.setFloating, styles],
  );
}

export function useTableHandlesPositioning(
  show: boolean,
  referencePosCell: DOMRect | null,
  referencePosTable: DOMRect | null,
  draggingState?: {
    draggedCellOrientation: "row" | "col";
    mousePos: number;
  },
): {
  rowHandle: ReturnType<typeof useTableHandlePosition>;
  colHandle: ReturnType<typeof useTableHandlePosition>;
  cellHandle: ReturnType<typeof useTableHandlePosition>;
} {
  const rowHandle = useTableHandlePosition(
    "row",
    show,
    referencePosCell,
    referencePosTable,
    draggingState,
  );
  const colHandle = useTableHandlePosition(
    "col",
    show,
    referencePosCell,
    referencePosTable,
    draggingState,
  );
  const cellHandle = useTableHandlePosition(
    "cell",
    show,
    referencePosCell,
    referencePosTable,
    draggingState,
  );

  return useMemo(
    () => ({
      rowHandle,
      colHandle,
      cellHandle,
    }),
    [colHandle, rowHandle, cellHandle],
  );
}
