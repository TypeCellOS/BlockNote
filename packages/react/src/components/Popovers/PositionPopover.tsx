import { posToDOMRect } from "@tiptap/core";
import { useMemo, useRef } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { GenericPopover } from "./GenericPopover.js";
import { flattenDOMRect } from "./util/flattenDOMRect.js";
import { FloatingUIPopoverProps } from "./util/FloatingUIPopoverProps.js";

export const PositionPopover = (
  props: FloatingUIPopoverProps & {
    position: { from: number; to?: number } | undefined;
  },
) => {
  const { position, floatingUIOptions, elementProps, children } = props;

  const editor = useBlockNoteEditor<any, any, any>();

  // Stores the last created `boundingClientRect` to use in case `position` is
  // not defined.
  const boundingClientRect = useRef<DOMRect>(new DOMRect());
  const virtualElement = useMemo(
    () => ({
      getBoundingClientRect: () => {
        if (!position) {
          return boundingClientRect.current;
        }

        // Flatten to JSON to avoid re-renders.
        boundingClientRect.current = flattenDOMRect(
          posToDOMRect(
            editor.prosemirrorView,
            position.from,
            position.to ?? position.from,
          ),
        );

        return boundingClientRect.current;
      },
    }),
    [editor, position],
  );

  return (
    <GenericPopover
      positionReference={virtualElement}
      floatingUIOptions={floatingUIOptions}
      elementProps={elementProps}
    >
      {children}
    </GenericPopover>
  );
};
