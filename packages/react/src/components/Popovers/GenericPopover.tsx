import {
  useFloating,
  useTransitionStyles,
  useDismiss,
  useInteractions,
  useMergeRefs,
  useTransitionStatus,
  autoUpdate,
  ReferenceType,
  useHover,
} from "@floating-ui/react";
import { ReactNode, useEffect, useRef } from "react";

import { FloatingUIOptions } from "./FloatingUIOptions.js";

export const GenericPopover = (
  props: FloatingUIOptions & {
    reference?: ReferenceType | null;
    children: ReactNode;
  },
) => {
  const { refs, floatingStyles, context } = useFloating<HTMLDivElement>({
    whileElementsMounted: autoUpdate,
    ...props.useFloatingOptions,
  });

  const { isMounted, styles } = useTransitionStyles(
    context,
    props.useTransitionStylesProps,
  );
  const { status } = useTransitionStatus(
    context,
    props.useTransitionStatusProps,
  );

  const dismiss = useDismiss(context, props.useDismissProps);
  const hover = useHover(context, { enabled: false, ...props.useHoverProps });
  const { getFloatingProps } = useInteractions([dismiss, hover]);

  const innerHTML = useRef<string>("");
  const ref = useRef<HTMLDivElement>(null);
  const mergedRefs = useMergeRefs([ref, refs.setFloating]);

  useEffect(() => {
    if (props.reference) {
      if (props.reference instanceof Element) {
        refs.setReference(props.reference);
      } else {
        // FloatingUI's virtual elements can have a `contextElement`, which is
        // useful for automatically calling `getBoundingClientRect` when said
        // element changes position. However, it's pretty limited as FloatingUI
        // doesn't attach listeners to `contextElement` for e.g. `useHover`.
        // Therefore, we also set the reference element to `contextElement` so
        // event listeners can be attached.
        if (props.reference.contextElement) {
          refs.setReference(props.reference.contextElement);
        }
        refs.setPositionReference(props.reference);
      }
    }
  }, [props.reference, refs]);

  // Stores the last rendered `innerHTML` of the popover while it was
  // open. The `innerHTML` is used while the popover is closing, as the
  // React children may rerender during this time, causing unwanted
  // behaviour.
  useEffect(() => {
    if (status === "initial" || status === "open") {
      if (ref.current?.innerHTML) {
        innerHTML.current = ref.current.innerHTML;
      }
    }
  }, [status, props.reference]);

  if (!isMounted) {
    return false;
  }

  const { style, ...rest } = props.elementProps || {};

  const mergedStyles = {
    display: "flex",
    ...styles,
    ...floatingStyles,
    ...style,
  };
  const mergedProps = { ...getFloatingProps(), ...rest };

  if (status === "close") {
    // While the popover is closing, shows its last rendered `innerHTML` while
    // it was open, instead of the React children. This is because they may
    // rerender during this time, causing unwanted behaviour.
    //
    // When we use the `GenericPopover` for BlockNote's internal UI elements
    // this isn't a huge deal, as we only pass child components if the popover
    // should be open. So without this fix, the popover just won't transition
    // out and will instead appear to hide instantly.
    return (
      <div
        ref={mergedRefs}
        style={mergedStyles}
        {...mergedProps}
        dangerouslySetInnerHTML={{ __html: innerHTML.current }}
      />
    );
  }

  return (
    <div ref={mergedRefs} style={mergedStyles} {...mergedProps}>
      {props.children}
    </div>
  );
};
