import { getNodeById, isContainerNode } from "@blocknote/core";
import { ReactNode, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { FloatingUIOptions } from "./FloatingUIOptions.js";
import { GenericPopover, GenericPopoverReference } from "./GenericPopover.js";

export const BlockPopover = (
  props: FloatingUIOptions & {
    blockId: string | undefined;
    children: ReactNode;
    portalElement?: HTMLElement | null;
  },
) => {
  const { blockId, children, portalElement, ...floatingUIOptions } = props;

  const editor = useBlockNoteEditor<any, any, any>();

  const reference = useMemo<GenericPopoverReference | undefined>(
    () =>
      editor.transact((tr) => {
        if (!blockId) {
          return undefined;
        }

        // TODO use the location API for this
        const nodePosInfo = getNodeById(blockId, tr.doc);
        if (!nodePosInfo) {
          return undefined;
        }

        // For container blocks the PM node IS the block, so a position
        // inside it resolves to its contentDOM — the child-blocks area —
        // which would anchor the popover to the first child's rows instead
        // of the block's own element.
        if (isContainerNode(nodePosInfo.node.type)) {
          const dom = editor.prosemirrorView.nodeDOM(nodePosInfo.posBeforeNode);
          // Frameworks like React wrap the node view in a `display: contents`
          // element that has no box of its own (a zero-size bounding rect), so
          // anchoring to it would place the popover at (0, 0). The block's
          // actual box is the author's root element inside it, which core
          // stamps with `data-node-type`; vanilla containers render that boxed
          // element directly as the node view's DOM.
          if (dom instanceof Element) {
            const boxed = dom.matches("[data-node-type]")
              ? dom
              : dom.querySelector("[data-node-type]");
            if (boxed) {
              return { element: boxed };
            }
          }
        }

        const { node } = editor.prosemirrorView.domAtPos(
          nodePosInfo.posBeforeNode + 1,
        );
        if (!(node instanceof Element)) {
          return undefined;
        }

        return {
          element: node,
        };
      }),
    [editor, blockId],
  );

  return (
    <GenericPopover
      reference={reference}
      portalElement={portalElement}
      {...floatingUIOptions}
    >
      {blockId !== undefined && children}
    </GenericPopover>
  );
};
