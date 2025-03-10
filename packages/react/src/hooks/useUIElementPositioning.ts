import {
  useDismiss,
  useFloating,
  UseFloatingOptions,
  useInteractions,
  useTransitionStyles,
  VirtualElement,
} from "@floating-ui/react";
import { useEffect, useMemo } from "react";

type ReferencePos = DOMRect | HTMLElement | VirtualElement | null;
function isVirtualElement(element: ReferencePos): element is VirtualElement {
  return (element as VirtualElement).getBoundingClientRect !== undefined;
}

export function useUIElementPositioning(
  show: boolean,
  referencePos: DOMRect | HTMLElement | VirtualElement | null,
  zIndex: number,
  options?: Partial<UseFloatingOptions & { canDismiss: boolean }>
) {
  const { refs, update, context, floatingStyles } = useFloating({
    open: show,
    ...options,
  });
  const { isMounted, styles } = useTransitionStyles(context);

  // handle "escape" and other dismiss events, these will add some listeners to
  // getFloatingProps which need to be attached to the floating element
  const dismiss = useDismiss(context, { enabled: options?.canDismiss });

  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  useEffect(() => {
    update();
  }, [referencePos, update]);

  useEffect(() => {
    // Will be null on initial render when used in UI component controllers.
    if (referencePos === null) {
      return;
    }

    if (referencePos instanceof HTMLElement) {
      refs.setReference(referencePos);
    } else if (isVirtualElement(referencePos)) {
      refs.setReference(referencePos);
    } else {
      refs.setReference({
        getBoundingClientRect: () => referencePos,
      });
    }
  }, [referencePos, refs]);

  return useMemo(() => {
    return {
      isMounted,
      ref: refs.setFloating,
      setReference: refs.setReference,
      style: {
        display: "flex",
        ...styles,
        ...floatingStyles,
        zIndex: zIndex,
      },
      getFloatingProps,
      getReferenceProps,
    };
  }, [
    floatingStyles,
    isMounted,
    refs.setFloating,
    refs.setReference,
    styles,
    zIndex,
    getFloatingProps,
    getReferenceProps,
  ]);
}
