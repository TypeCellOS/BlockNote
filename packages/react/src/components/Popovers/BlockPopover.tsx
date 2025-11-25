import { getNodeById } from "@blocknote/core";
import { ClientRectObject, VirtualElement } from "@floating-ui/react";
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

  // Stores the last `boundingClientRect` to use from when the block's DOM
  // element was still mounted. This is because `DOMRect`s returned from
  // calling `getBoundingClientRect` on unmounted elements will have x, y,
  // height, and width of 0. This can cause issues when the popover is
  // transitioning out.
  // TODO: Move this logic to the `GenericPopover`.
  const mountedBoundingClientRect = useRef<ClientRectObject>(new DOMRect());
  const virtualElement = useMemo(
    () =>
      editor.transact((tr) => {
        const virtualElement: VirtualElement = {
          getBoundingClientRect: () => mountedBoundingClientRect.current,
        };

        if (!blockId) {
          return virtualElement;
        }

        // TODO use the location API for this
        const nodePosInfo = getNodeById(blockId, tr.doc);
        if (!nodePosInfo) {
          return virtualElement;
        }

        const { node } = editor.prosemirrorView.domAtPos(
          nodePosInfo.posBeforeNode + 1,
        );
        if (!(node instanceof Element)) {
          return virtualElement;
        }

        mountedBoundingClientRect.current = node.getBoundingClientRect();

        return virtualElement;
      }),
    [editor, blockId],
  );

  return (
    <GenericPopover reference={virtualElement} {...floatingUIOptions}>
      {blockId !== undefined && children}
    </GenericPopover>
  );
};
