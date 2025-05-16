import { size, useFloating, useTransitionStyles } from "@floating-ui/react";
import { useEffect, useMemo } from "react";

function useExtendButtonPosition(
  orientation: "addOrRemoveRows" | "addOrRemoveColumns",
  show: boolean,
  referencePosTable: DOMRect | null,
): {
  isMounted: boolean;
  ref: (node: HTMLElement | null) => void;
  style: React.CSSProperties;
} {
  const { refs, update, context, floatingStyles } = useFloating({
    open: show,
    placement: orientation === "addOrRemoveColumns" ? "right" : "bottom",
    middleware: [
      size({
        apply({ rects, elements }) {
          Object.assign(
            elements.floating.style,
            orientation === "addOrRemoveColumns"
              ? {
                  height: `${rects.reference.height}px`,
                }
              : {
                  width: `${rects.reference.width}px`,
                },
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
    [floatingStyles, isMounted, refs.setFloating, styles],
  );
}

export function useExtendButtonsPositioning(
  showAddOrRemoveColumnsButton: boolean,
  showAddOrRemoveRowsButton: boolean,
  referencePosTable: DOMRect | null,
): {
  addOrRemoveRowsButton: ReturnType<typeof useExtendButtonPosition>;
  addOrRemoveColumnsButton: ReturnType<typeof useExtendButtonPosition>;
} {
  const addOrRemoveRowsButton = useExtendButtonPosition(
    "addOrRemoveRows",
    showAddOrRemoveRowsButton,
    referencePosTable,
  );
  const addOrRemoveColumnsButton = useExtendButtonPosition(
    "addOrRemoveColumns",
    showAddOrRemoveColumnsButton,
    referencePosTable,
  );

  return useMemo(
    () => ({
      addOrRemoveRowsButton,
      addOrRemoveColumnsButton,
    }),
    [addOrRemoveColumnsButton, addOrRemoveRowsButton],
  );
}
