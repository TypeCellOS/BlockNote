import { useUIElementPositioning } from "@blocknote/react";
import {
  OpenChangeReason,
  UseDismissProps,
  UseFloatingOptions,
  autoUpdate,
  offset,
  size,
} from "@floating-ui/react";
import { useMemo } from "react";
// The block positioner automattically positions it's children below the block with `blockID`
export const BlockPositioner = (props: {
  blockID?: string;
  children: React.ReactNode;
  onOpenChange?: (
    open: boolean,
    event: Event,
    reason: OpenChangeReason,
  ) => void;
  canDismissViaOutsidePress?: boolean;
  floatingOptions?: Partial<
    UseFloatingOptions & { canDismiss: boolean | UseDismissProps }
  >;
}) => {
  const element = props.blockID
    ? document.querySelector(`[data-id="${props.blockID}"]`)
    : undefined;

  // Note that we can't pass element directly, because the useDismiss then doesn't work when clicking on the element
  // (for that to work, we'd need to implement getReferenceProps(), but it's probably unsafe to attach those listeners to a prosemirror managed element)
  const reference = useMemo(() => {
    return element
      ? {
          getBoundingClientRect: () => {
            return element.getBoundingClientRect();
          },
          contextElement: element,
        }
      : null;
  }, [element]);

  const { isMounted, ref, style, getFloatingProps, isPositioned } =
    useUIElementPositioning(element ? true : false, reference, 3000, {
      canDismiss: {
        enabled: true,
        escapeKey: true,
        outsidePress: props.canDismissViaOutsidePress,
      },
      placement: "bottom",
      middleware: [
        offset(10),
        // flip(),
        size({
          apply({ rects, elements }) {
            Object.assign(elements.floating.style, {
              width: `${rects.reference.width}px`,
            });
          },
        }),
      ],
      onOpenChange: props.onOpenChange,
      whileElementsMounted: (referenceEl, floatingEl, update) => {
        const cleanup = autoUpdate(referenceEl, floatingEl, update, {
          animationFrame: true,
        });
        return cleanup;
      },
      ...props.floatingOptions,
    });

  if (!isMounted) {
    return null;
  }

  return (
    <div
      ref={ref}
      style={{
        ...style,
      }}
      {...getFloatingProps()}
    >
      {isPositioned && props.children}
    </div>
  );
};
