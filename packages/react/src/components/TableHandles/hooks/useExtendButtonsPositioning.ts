import { size, useFloating, useTransitionStyles } from "@floating-ui/react";
import { useEffect, useMemo } from "react";

function useExtendButtonPosition(
  orientation: "row" | "col",
  show: boolean,
  referencePosTable: DOMRect | null
) {
  const { refs, update, context, floatingStyles } = useFloating({
    open: show,
    placement: orientation === "row" ? "right" : "bottom",
    middleware: [
      size({
        apply({ rects, elements }) {
          Object.assign(
            elements.floating.style,
            orientation === "row"
              ? {
                  height: `${rects.reference.height}px`,
                }
              : {
                  width: `${rects.reference.width}px`,
                }
          );
        },
      }),
    ],
  });

  const { isMounted, styles } = useTransitionStyles(context);

  useEffect(() => {
    update();
  }, [referencePosTable, update]);

  useEffect(() => {
    // Will be null on initial render when used in UI component controllers.
    if (referencePosTable === null) {
      return;
    }

    refs.setReference({
      getBoundingClientRect: () => referencePosTable,
    });
  }, [orientation, referencePosTable, refs]);

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
    [floatingStyles, isMounted, refs.setFloating, styles]
  );
}

export function useExtendButtonsPositioning(
  showExtendButtonRow: boolean,
  showExtendButtonCol: boolean,
  referencePosTable: DOMRect | null,
  draggingState?: {
    draggedCellOrientation: "row" | "col";
    mousePos: number;
  }
): {
  rowExtendButton: ReturnType<typeof useExtendButtonPosition>;
  colExtendButton: ReturnType<typeof useExtendButtonPosition>;
} {
  const rowExtendButton = useExtendButtonPosition(
    "row",
    showExtendButtonRow,
    referencePosTable
  );
  const colExtendButton = useExtendButtonPosition(
    "col",
    showExtendButtonCol,
    referencePosTable
  );

  return useMemo(
    () => ({
      rowExtendButton,
      colExtendButton,
    }),
    [colExtendButton, rowExtendButton]
  );
}
