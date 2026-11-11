import { size, useFloating, useTransitionStyles } from "@floating-ui/react";
import { useEffect, useMemo } from "react";
import { tableHandleSide } from "./tableHandlePlacement.js";

function useExtendButtonPosition(
  orientation: "addOrRemoveRows" | "addOrRemoveColumns",
  show: boolean,
  referencePosTable: DOMRect | null,
  direction: "ltr" | "rtl",
): {
  isMounted: boolean;
  ref: (node: HTMLElement | null) => void;
  style: React.CSSProperties;
} {
  const { refs, update, context, floatingStyles } = useFloating({
    open: show,
    placement:
      orientation === "addOrRemoveColumns"
        ? tableHandleSide(direction, "end")
        : "bottom",
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

/** Pass the table's layout direction to opt into mirrored extension controls. Defaults to LTR for existing callers. */
export function useExtendButtonsPositioning(
  showAddOrRemoveColumnsButton: boolean,
  showAddOrRemoveRowsButton: boolean,
  referencePosTable: DOMRect | null,
  direction: "ltr" | "rtl" = "ltr",
): {
  addOrRemoveRowsButton: ReturnType<typeof useExtendButtonPosition>;
  addOrRemoveColumnsButton: ReturnType<typeof useExtendButtonPosition>;
} {
  const addOrRemoveRowsButton = useExtendButtonPosition(
    "addOrRemoveRows",
    showAddOrRemoveRowsButton,
    referencePosTable,
    direction,
  );
  const addOrRemoveColumnsButton = useExtendButtonPosition(
    "addOrRemoveColumns",
    showAddOrRemoveColumnsButton,
    referencePosTable,
    direction,
  );

  return useMemo(
    () => ({
      addOrRemoveRowsButton,
      addOrRemoveColumnsButton,
    }),
    [addOrRemoveColumnsButton, addOrRemoveRowsButton],
  );
}
