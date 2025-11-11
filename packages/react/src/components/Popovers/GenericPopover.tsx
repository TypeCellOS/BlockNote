import {
  useFloating,
  useTransitionStyles,
  useDismiss,
  useInteractions,
  useMergeRefs,
  useTransitionStatus,
  autoUpdate,
  ReferenceType,
} from "@floating-ui/react";
import { isEventTargetWithin } from "@floating-ui/react/utils";
import { useEffect, useRef } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { FloatingUIPopoverProps } from "./util/FloatingUIPopoverProps.js";

export const GenericPopover = (
  props: FloatingUIPopoverProps & {
    positionReference: ReferenceType;
  },
) => {
  const editor = useBlockNoteEditor<any, any, any>();

  const { refs, floatingStyles, context } = useFloating<HTMLDivElement>({
    whileElementsMounted: autoUpdate,
    ...props.floatingUIOptions,
  });

  const { isMounted, styles } = useTransitionStyles(context);
  const { status } = useTransitionStatus(context);

  // Handle "escape" and other dismiss events, like clicking outside the
  // editor.
  const dismiss = useDismiss(context, {
    enabled: true,
    escapeKey: true,
    // TODO: Not working
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

  const innerHTML = useRef<string>("");
  const ref = useRef<HTMLDivElement>(null);
  const mergedRefs = useMergeRefs([ref, refs.setFloating]);

  useEffect(() => {
    if (status === "initial" || status === "open") {
      if (ref.current?.innerHTML) {
        // Stores the last rendered `innerHTML` of the popover while it was
        // open. The `innerHTML` is used while the popover is closing, as the
        // React children may rerender during this time, causing unwanted
        // behaviour.
        innerHTML.current = ref.current.innerHTML;
      }
    }
  }, [status]);

  useEffect(() => {
    refs.setPositionReference(props.positionReference);
  }, [props.positionReference, refs]);

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
    // An example of this is with the Formatting Toolbar. While it's open,
    // clicking a different block will cause the popover to close as the
    // selection collapses. At the same time, the popover begins to close and
    // the toolbar re-renders, showing buttons corresponding to the block at
    // the new selection while it's still displayed at the previous selection.
    // The File Panel meanwhile, will throw an error, as it requires a block
    // ID to be passed to it, which will be undefined while the popver is
    // closing.
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
