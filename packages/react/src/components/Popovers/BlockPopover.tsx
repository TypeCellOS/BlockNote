import { getNodeById } from "@blocknote/core";
import { VirtualElement } from "@floating-ui/react";
import { ReactNode, useMemo, useRef } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { FloatingUIOptions } from "./FloatingUIOptions.js";
import { GenericPopover } from "./GenericPopover.js";

export const BlockPopover = (
  props: FloatingUIOptions & {
    blockId: string | undefined;
    children: ReactNode;
  },
) => {
  const { blockId, children, ...floatingUIOptions } = props;

  const editor = useBlockNoteEditor<any, any, any>();

  // Stores the last created `boundingClientRect` to use in case `blockId` is
  // not defined, or the block could not be found in the editor.
  // TODO: Move this logic to the `GenericPopover`.
  const boundingClientRect = useRef<DOMRect>(new DOMRect());
  // Uses a virtual element instead of directly using the block's DOM element
  // to better handle when the block is deleted from the editor. When using the
  // DOM element directly, this will cause the element to unmount. FloatingUI
  // will then call `getBoundingClientRect` on a the unmounted DOM element,
  // resulting in an incorrect `DOMRect` with x, y, height, and width of 0.
  // With a virtual element, we can instead use the last `DOMRect` from when
  // the block still existed.
  const virtualElement = useMemo<VirtualElement>(
    () =>
      editor.transact((tr) => {
        if (!blockId) {
          return { getBoundingClientRect: () => boundingClientRect.current };
        }

        // TODO use the location API for this
        const nodePosInfo = getNodeById(blockId, tr.doc);
        if (!nodePosInfo) {
          return { getBoundingClientRect: () => boundingClientRect.current };
        }

        const { node } = editor.prosemirrorView.domAtPos(
          nodePosInfo.posBeforeNode + 1,
        );
        if (!(node instanceof Element)) {
          return { getBoundingClientRect: () => boundingClientRect.current };
        }

        return {
          getBoundingClientRect: () => {
            boundingClientRect.current = node.getBoundingClientRect();
            return boundingClientRect.current;
          },
          contextElement: node,
        };
      }),
    [editor, blockId],
  );

  return (
    <GenericPopover reference={virtualElement} {...floatingUIOptions}>
      {blockId !== undefined && children}
    </GenericPopover>
  );
};
