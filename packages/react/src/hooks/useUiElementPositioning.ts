import {
  useFloating,
  UseFloatingOptions,
  useTransitionStyles,
} from "@floating-ui/react";
import { useEffect, useMemo } from "react";

import { UiComponentPosition } from "../components-shared/UiComponentTypes";

export function useUiElementPositioning(
  show: boolean,
  referencePos: DOMRect | null,
  zIndex: number,
  options?: Partial<UseFloatingOptions>
): UiComponentPosition {
  const { refs, update, context, floatingStyles } = useFloating({
    open: show,
    ...options,
  });

  const { isMounted, styles } = useTransitionStyles(context);

  useEffect(() => {
    update();
  }, [referencePos, update]);

  useEffect(() => {
    // TODO: Maybe throw error instead if null
    if (referencePos === null) {
      return;
    }

    refs.setReference({
      getBoundingClientRect: () => referencePos,
    });
  }, [referencePos, refs]);

  return useMemo(
    () => ({
      isMounted,
      ref: refs.setFloating,
      style: {
        display: "flex",
        ...styles,
        ...floatingStyles,
        zIndex: zIndex,
      },
    }),
    [floatingStyles, isMounted, refs.setFloating, styles, zIndex]
  );
}
