import { useUIElementPositioning } from "@blocknote/react";
import {
  OpenChangeReason,
  autoUpdate,
  flip,
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
    reason: OpenChangeReason
  ) => void;
}) => {
  // TODO: desirable to do like this?
  const element = document.querySelector(
    `[data-id="${props.blockID}"]`
  ) as HTMLElement;

  // Note that we can't pass element directly, because the useDismiss then doesn't work when clicking on the element
  // (for that to work, we'd need to implement getReferenceProps(), but it's probably unsafe to attach those listeners to a prosemirror managed element)
  const reference = useMemo(() => {
    return element
      ? {
          getBoundingClientRect: () => {
            // console.log(
            //   "getBoundingClientRect",
            //   element.getBoundingClientRect()
            // );
            return element.getBoundingClientRect();
          },
          contextElement: element,
        }
      : null;
  }, [element]);

  const { isMounted, ref, style, getFloatingProps } = useUIElementPositioning(
    element ? true : false,
    reference,
    3000,
    {
      // canDismiss: false,
      placement: "bottom",
      middleware: [
        offset(10),
        flip(),
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
    }
  );

  if (!isMounted) {
    return null;
  }

  return (
    <div
      ref={ref}
      style={{
        ...style,
        // top: state.blockIsEmpty ? -state.referencePos.height - 3 : style.top,
      }}
      {...getFloatingProps()}>
      {props.children}
    </div>
  );
};
