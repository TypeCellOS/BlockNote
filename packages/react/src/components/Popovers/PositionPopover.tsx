import { BlockNoteEditor } from "@blocknote/core";
import { posToDOMRect } from "@tiptap/core";
import { useMemo, useRef } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { GenericPopover } from "./GenericPopover.js";
import { flattenDOMRect } from "./util/flattenDOMRect.js";
import { FloatingUIPopoverProps } from "./util/FloatingUIPopoverProps.js";

export const PositionPopover = (
  props: FloatingUIPopoverProps & {
    getPosition: (editor: BlockNoteEditor<any, any, any>) =>
      | {
          from: number;
          to?: number;
        }
      | undefined;
  },
) => {
  const { getPosition, floatingUIOptions, elementProps, children } = props;

  const editor = useBlockNoteEditor<any, any, any>();

  // Store the current `boundingClientRect` to use in case `getPosition`
  // returns `undefined`.
  const boundingClientRect = useRef<DOMRect>(new DOMRect());
  const virtualElement = useMemo(
    () => ({
      getBoundingClientRect: () => {
        const range = getPosition(editor);
        if (!range) {
          throw new Error(
            "getPosition returned undefined while popover is open.",
          );
        }

        // Flatten to JSON to avoid re-renders.
        boundingClientRect.current = flattenDOMRect(
          posToDOMRect(
            editor.prosemirrorView,
            range.from,
            range.to ?? range.from,
          ),
        );

        return boundingClientRect.current;
      },
      // contextElement: editor.prosemirrorView.dom,
    }),
    [editor, getPosition],
  );

  return (
    <GenericPopover
      virtualElement={virtualElement}
      floatingUIOptions={floatingUIOptions}
      elementProps={elementProps}
    >
      {children}
    </GenericPopover>
  );
};
