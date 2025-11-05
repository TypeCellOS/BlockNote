import { BlockNoteEditor, getNodeById } from "@blocknote/core";
import { posToDOMRect } from "@tiptap/core";
import { useMemo, useRef } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { GenericPopover } from "./GenericPopover.js";
import { flattenDOMRect } from "./util/flattenDOMRect.js";
import { FloatingUIPopoverProps } from "./util/FloatingUIPopoverProps.js";

export const BlockPopover = (
  props: FloatingUIPopoverProps & {
    getBlockId: (editor: BlockNoteEditor<any, any, any>) => string | undefined;
    placement?: "before" | "after" | "across";
  },
) => {
  const { getBlockId, placement, floatingUIOptions, elementProps, children } =
    props;

  const editor = useBlockNoteEditor<any, any, any>();

  // Store the current `boundingClientRect` to use in case `getBlockId` returns
  // `undefined`.
  const boundingClientRect = useRef<DOMRect>(new DOMRect());
  const virtualElement = useMemo(
    () => ({
      getBoundingClientRect: () => {
        return editor.transact((tr) => {
          const blockId = getBlockId(editor);
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
      // contextElement:
      //   // TODO should not need to know the DOM structure here
      //   editor.prosemirrorView.dom.querySelector(
      //     `[data-id="${props.blockId}"]`,
      //   ) || editor.prosemirrorView.dom,
    }),
    [getBlockId, editor, placement],
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
