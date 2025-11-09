import { getNodeById } from "@blocknote/core";
import { posToDOMRect } from "@tiptap/core";
import { useMemo, useRef } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { GenericPopover } from "./GenericPopover.js";
import { flattenDOMRect } from "./util/flattenDOMRect.js";
import { FloatingUIPopoverProps } from "./util/FloatingUIPopoverProps.js";

export const BlockPopover = (
  props: FloatingUIPopoverProps & {
    blockId: string | undefined;
    placement?: "before" | "after" | "across";
  },
) => {
  const { blockId, placement, floatingUIOptions, elementProps, children } =
    props;

  const editor = useBlockNoteEditor<any, any, any>();

  // Stores the last created `boundingClientRect` to use in case `blockId` is
  // not defined.
  const boundingClientRect = useRef<DOMRect>(new DOMRect());
  const virtualElement = useMemo(
    () => ({
      getBoundingClientRect: () => {
        return editor.transact((tr) => {
          if (!blockId) {
            return boundingClientRect.current;
          }

          // TODO use the location API for this
          const nodePosInfo = getNodeById(blockId, tr.doc);
          if (!nodePosInfo) {
            return boundingClientRect.current;
          }

          const startPos = nodePosInfo.posBeforeNode + 1;
          const endPos =
            nodePosInfo.posBeforeNode + nodePosInfo.node.content.size + 1;

          const range =
            placement === "before"
              ? { from: startPos }
              : placement === "after"
                ? { from: endPos }
                : { from: startPos, to: endPos };

          // Flatten to JSON to avoid re-renders.
          boundingClientRect.current = flattenDOMRect(
            posToDOMRect(
              editor.prosemirrorView,
              range.from,
              range.to ?? range.from,
            ),
          );

          return boundingClientRect.current;
        });
      },
    }),
    [editor, blockId, placement],
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
