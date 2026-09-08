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

        // Containers anchor to their own root, not the child-block contentDOM.
        if (isContainerNode(nodePosInfo.node.type)) {
          const dom = editor.prosemirrorView.nodeDOM(nodePosInfo.posBeforeNode);
          if (dom instanceof Element) {
            // React adds two display:contents wrappers around the author root.
            const root = dom.matches(".bn-container-node-view")
              ? dom.querySelector(":scope > [data-node-view-wrapper]")
                  ?.firstElementChild
              : dom;
            return { element: root ?? dom };
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
