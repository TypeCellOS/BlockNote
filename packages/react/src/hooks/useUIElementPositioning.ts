import {
  useDismiss,
  UseDismissProps,
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

type UIElementPosition = {
  isMounted: boolean;
  ref: (node: HTMLElement | null) => void;
  style: React.CSSProperties;
  getFloatingProps: ReturnType<typeof useInteractions>["getFloatingProps"];
  getReferenceProps: ReturnType<typeof useInteractions>["getReferenceProps"];
  setReference: ReturnType<typeof useFloating>["refs"]["setReference"];
  isPositioned: boolean;
};

export function useUIElementPositioning(
  show: boolean,
  referencePos: DOMRect | HTMLElement | VirtualElement | null,
  zIndex: number,
  options?: Partial<
    UseFloatingOptions & { canDismiss: boolean | UseDismissProps }
  >,
): UIElementPosition {
  const { refs, update, context, floatingStyles, isPositioned } = useFloating({
    open: show,
    ...options,
  });
  const { isMounted, styles } = useTransitionStyles(context);

  const dismissOptions =
    typeof options?.canDismiss === "object"
      ? options.canDismiss
      : {
          enabled: options?.canDismiss,
        };
  // handle "escape" and other dismiss events, these will add some listeners to
  // getFloatingProps which need to be attached to the floating element
  const dismiss = useDismiss(context, dismissOptions);

  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

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

    update();
  }, [referencePos, refs, update]);

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
      isPositioned,
    };
  }, [
    isPositioned,
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
