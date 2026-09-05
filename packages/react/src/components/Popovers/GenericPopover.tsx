import {
  autoUpdate,
  FloatingFocusManager,
  FloatingPortal,
  hide,
  useDismiss,
  useFloating,
  UseFloatingOptions,
  useHover,
  useInteractions,
  useMergeRefs,
  useTransitionStatus,
  useTransitionStyles,
} from "@floating-ui/react";
import { HTMLAttributes, ReactNode, useEffect, useRef } from "react";

import {
  hasChildrenBesidesPortalElementAnchor,
  PortalElementAnchor,
  usePortalElement,
} from "../../editor/PortalElementOverride.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
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
      element: undefined;
      // When no reference element is provided, this can be provided as an
      // alternative "virtual" element to position the popover around.
      getBoundingClientRect: () => DOMRect;
      // Optional per-line client rects, required by floating-ui's `inline()`
      // middleware. Virtual elements have no default `getClientRects`, so it
      // must be provided explicitly when `inline()` is used.
      getClientRects?: () => DOMRectList;
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
      // See above.
      getClientRects?: () => DOMRectList;
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
      reference.element &&
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

/**
 * Merges two `whileElementsMounted` handlers into one. Both run when elements
 * mount, and both cleanup functions are called on unmount.
 */
function mergeWhileElementsMounted(
  a: UseFloatingOptions["whileElementsMounted"],
  b: UseFloatingOptions["whileElementsMounted"],
): UseFloatingOptions["whileElementsMounted"] {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }

  return (reference, floating, update) => {
    const cleanupA = a(reference, floating, update);
    const cleanupB = b(reference, floating, update);
    return () => {
      cleanupA?.();
      cleanupB?.();
    };
  };
}

export const GenericPopover = (
  props: FloatingUIOptions & {
    reference?: GenericPopoverReference;
    children: ReactNode;
  },
) => {
  const editor = useBlockNoteEditor();
  // The ambient portal element — always a resolved, themed, registered root, as
  // `EditorPortalContext` is only ever provided by `PortalElementOverride` (the default from
  // `BlockNoteView`, or a controller's / the mobile toolbar's override).
  // `null` during SSR and for the frame before resolution — handled after the
  // hooks below.
  const portalElement = usePortalElement();
  const {
    whileElementsMounted: _whileElementsMounted,
    middleware,
    ...restFloatingOptions
  } = props.useFloatingOptions ?? {};

  const { refs, floatingStyles, context, middlewareData } =
    useFloating<HTMLDivElement>({
      whileElementsMounted: mergeWhileElementsMounted(
        autoUpdate,
        props.useFloatingOptions?.whileElementsMounted,
      ),
      middleware: [...(middleware ?? []), hide()],
      // Position with `top`/`left` instead of `transform`: a transform makes
      // the popover the containing block for `position: fixed` descendants,
      // which breaks any nested UI that pins itself to the viewport (e.g. the
      // comment composer is a full BlockNoteView whose mobile formatting
      // toolbar is viewport-fixed).
      transform: false,
      ...restFloatingOptions,
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

      if (
        element !== undefined &&
        (props.focusManagerProps?.disabled || !editor.isWithinEditor(element))
      ) {
        // Only set domReference when FloatingFocusManager is disabled.
        // When FloatingFocusManager is active (disabled !== false) and the
        // reference is inside the ProseMirror editor, setting domReference
        // causes floating-ui to call insertAdjacentElement on the reference,
        // inserting a focus-return <span> into the PM contenteditable. This
        // triggers PM's MutationObserver and resets the editor selection.
        // (issue #2525)
        refs.setReference(element);
      }

      // Forward `getClientRects` when provided, so floating-ui's `inline()`
      // middleware can read per-line rects off a virtual reference (it calls
      // `getClientRects()`, which virtual elements lack by default).
      const getClientRects =
        "getClientRects" in props.reference
          ? props.reference.getClientRects
          : undefined;

      refs.setPositionReference({
        getBoundingClientRect: getMountedBoundingClientRectCache(
          props.reference,
        ),
        ...(getClientRects ? { getClientRects } : {}),
        contextElement: element,
      });
    }
  }, [props.reference, refs, props.focusManagerProps?.disabled, editor]);

  // Stores the last rendered `innerHTML` of the popover while it was open. The
  // `innerHTML` is used while the popover is closing, as the React children
  // may rerender during this time, causing unwanted behaviour.
  useEffect(
    () => {
      if (status === "initial" || status === "open") {
        // Only store while the children have rendered something. In the
        // render where a controller flips `open` to `false`, its children are
        // typically already gone while `status` is still "open", and that
        // empty state must not replace the snapshot the closing popover is
        // about to show. The wrapper is never truly empty though: it always
        // contains the `PortalElementAnchor` holder.
        if (ref.current && hasChildrenBesidesPortalElementAnchor(ref.current)) {
          innerHTML.current = ref.current.innerHTML;
        }
      }
    },
    // `props.children` is added to the deps, since it's ultimately the HTML of
    // the children that we're storing.
    [status, props.reference, props.children],
  );

  if (!isMounted || !portalElement) {
    return false;
  }

  const mergedProps: HTMLAttributes<HTMLDivElement> = {
    ...props.elementProps,
    style: {
      display: "flex",
      ...props.elementProps?.style,
      zIndex: `calc(var(--bn-ui-base-z-index, 0) + ${props.elementProps?.style?.zIndex || 0})`,
      ...floatingStyles,
      ...styles,
      ...(middlewareData.hide?.referenceHidden
        ? { visibility: "hidden" as const }
        : {}),
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
      <FloatingPortal root={portalElement}>
        <div
          ref={mergedRefs}
          {...mergedProps}
          dangerouslySetInnerHTML={{ __html: innerHTML.current }}
        />
      </FloatingPortal>
    );
  }

  // The children render inside a `PortalElementAnchor`: the menus and popovers
  // they open portal into this wrapper instead of the editor container, so
  // they share its stacking context and visibility (they paint above what the
  // wrapper paints above, and hide when it hides) and move with it when
  // `portalElements` relocates it. Rendering them inline instead would clip
  // them to the toolbar, or, on iOS, to a scrolling one. See
  // `PortalElementAnchor` for the details; behaviour is pinned by
  // `tests/src/end-to-end/portals/floatingComponentMenus.test.tsx`.
  if (!props.focusManagerProps?.disabled) {
    return (
      <FloatingPortal root={portalElement}>
        <FloatingFocusManager {...props.focusManagerProps} context={context}>
          <div ref={mergedRefs} {...mergedProps}>
            <PortalElementAnchor>{props.children}</PortalElementAnchor>
          </div>
        </FloatingFocusManager>
      </FloatingPortal>
    );
  }

  return (
    <FloatingPortal root={portalElement}>
      <div ref={mergedRefs} {...mergedProps}>
        <PortalElementAnchor>{props.children}</PortalElementAnchor>
      </div>
    </FloatingPortal>
  );
};
