import {
  useFloating,
  useTransitionStyles,
  useDismiss,
  useInteractions,
  useMergeRefs,
  useTransitionStatus,
  autoUpdate,
  useHover,
} from "@floating-ui/react";
import { HTMLAttributes, ReactNode, useEffect, useRef } from "react";

import { FloatingUIOptions } from "./FloatingUIOptions.js";

export type GenericPopoverReference =
  | {
      // A DOM element to use as the reference element for the popover.
      element: Element;
      // To update the popover position, `element.getReferenceBoundingRect`
      // is called. This flag caches the last result of the call while the
      // element is mounted to the DOM, so it doesn't update while the
      // popover is closing and transitioning out. Useful for if the
      // reference element unmounts, as `element.getReferenceBoundingRect`
      // would return a `DOMRect` with x, y, width, and height of 0.
      // Defaults to `true`.
      cacheMountedBoundingClientRect?: boolean;
    }
  | {
      // When no reference element is provided, this can be provided as an
      // alternative "virtual" element to position the popover around.
      getBoundingClientRect: () => DOMRect;
    }
  | {
      element: Element;
      cacheMountedBoundingClientRect?: boolean;
      // If both `element` and `getBoundingClientRect` are provided, uses
      // `getBoundingClientRect` to position the popover, but still treats
      // `element` as the reference element for all other purposes. When
      // `cacheMountedBoundingClientRect` is `true` or unspecified, this
      // function is not called while the reference element is not mounted.
      getBoundingClientRect: () => DOMRect;
    };

// Returns a modified version of `getBoundingClientRect`, if
// `reference.element` is passed and `reference.cacheMountedBoundingClientRect`
// is `true` or `undefined`. In the modified version, each new result is cached
// and returned while `reference.element` is connected to the DOM. If it is no
// longer connected, the cache is no longer updated and the last cached result
// is used.
//
// In all other cases, just returns `reference.getBoundingClientRect`, or
// `reference.element.getBoundingClientRect` if it's not defined.
export function getMountedBoundingClientRectCache(
  reference: GenericPopoverReference,
) {
  let lastBoundingClientRect = new DOMRect();
  const getBoundingClientRect =
    "getBoundingClientRect" in reference
      ? () => reference.getBoundingClientRect()
      : () => reference.element.getBoundingClientRect();

  return () => {
    if (
      "element" in reference &&
      (reference.cacheMountedBoundingClientRect ?? true)
    ) {
      if (reference.element.isConnected) {
        lastBoundingClientRect = getBoundingClientRect();
      }

      return lastBoundingClientRect;
    }

    return getBoundingClientRect();
  };
}

export const GenericPopover = (
  props: FloatingUIOptions & {
    reference?: GenericPopoverReference;
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
  // Also returns `getReferenceProps` but unused as the reference element may
  // not even be managed by React, so we may be unable to set them. Seems like
  // `refs.setReferences` attaches most of the same listeners anyway, but
  // possible both are needed.
  const { getFloatingProps } = useInteractions([dismiss, hover]);

  const innerHTML = useRef<string>("");
  const ref = useRef<HTMLDivElement>(null);
  const mergedRefs = useMergeRefs([ref, refs.setFloating]);

  useEffect(() => {
    if (props.reference) {
      const element =
        "element" in props.reference ? props.reference.element : undefined;

      if (element !== undefined) {
        refs.setReference(element);
      }

      refs.setPositionReference({
        getBoundingClientRect: getMountedBoundingClientRectCache(
          props.reference,
        ),
        contextElement: element,
      });
    }
  }, [props.reference, refs]);

  // Stores the last rendered `innerHTML` of the popover while it was open. The
  // `innerHTML` is used while the popover is closing, as the React children
  // may rerender during this time, causing unwanted behaviour.
  useEffect(
    () => {
      if (status === "initial" || status === "open") {
        if (ref.current?.innerHTML) {
          innerHTML.current = ref.current.innerHTML;
        }
      }
    },
    // `props.children` is added to the deps, since it's ultimately the HTML of
    // the children that we're storing.
    [status, props.reference, props.children],
  );

  if (!isMounted) {
    return false;
  }

  const mergedProps: HTMLAttributes<HTMLDivElement> = {
    ...props.elementProps,
    style: {
      display: "flex",
      ...props.elementProps?.style,
      zIndex: `calc(var(--bn-ui-base-z-index) + ${props.elementProps?.style?.zIndex || 0})`,
      ...floatingStyles,
      ...styles,
    },
    ...getFloatingProps(),
  };

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
        {...mergedProps}
        dangerouslySetInnerHTML={{ __html: innerHTML.current }}
      />
    );
  }

  return (
    <div ref={mergedRefs} {...mergedProps}>
      {props.children}
    </div>
  );
};
