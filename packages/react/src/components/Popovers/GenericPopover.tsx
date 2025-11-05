import {
  useFloating,
  useTransitionStyles,
  useDismiss,
  useInteractions,
  VirtualElement,
  useMergeRefs,
  useTransitionStatus,
} from "@floating-ui/react";
import { isEventTargetWithin } from "@floating-ui/react/utils";
import { useEffect, useRef } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { FloatingUIPopoverProps } from "./util/FloatingUIPopoverProps.js";

export const GenericPopover = (
  props: FloatingUIPopoverProps & {
    virtualElement: VirtualElement;
  },
) => {
  const editor = useBlockNoteEditor<any, any, any>();

  const { refs, floatingStyles, context } = useFloating<HTMLDivElement>(
    props.floatingUIOptions,
  );

  const { isMounted, styles } = useTransitionStyles(context);

  // handle "escape" and other dismiss events, these will add some listeners to
  // getFloatingProps which need to be attached to the floating element
  const dismiss = useDismiss(context, {
    enabled: true,
    escapeKey: true,
    outsidePress: (e) => {
      const view = editor.prosemirrorView;

      const target = e.target;
      if (!target) {
        return false;
      }

      return !isEventTargetWithin(e, view.dom.parentElement);
    },
  });

  const { getFloatingProps } = useInteractions([dismiss]);

  useEffect(() => {
    refs.setPositionReference(props.virtualElement);
  }, [props.virtualElement, refs]);

  const { status } = useTransitionStatus(context);

  const ref = useRef<HTMLDivElement>(null);
  const mergedRefs = useMergeRefs([ref, refs.setFloating]);

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

  if (status === "close" && ref.current) {
    // Freezes the UI element rendered in the popover when it's fading out.
    // Otherwise, the element may re-render, causing a flicker. An example of
    // this is with the Formatting Toolbar. While it's open, clicking a different
    // block will cause the popover to close as the selection collapses. At the
    // same time, the toolbar re-renders, showing buttons corresponding to the
    // block at the new selection.
    return (
      <div
        ref={mergedRefs}
        style={mergedStyles}
        {...mergedProps}
        dangerouslySetInnerHTML={
          status === "close" && ref.current
            ? { __html: ref.current.innerHTML }
            : undefined
        }
      />
    );
  }

  return (
    <div ref={mergedRefs} style={mergedStyles} {...mergedProps}>
      {props.children}
    </div>
  );
};
