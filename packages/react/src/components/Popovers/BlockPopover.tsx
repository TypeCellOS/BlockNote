import { getNodeById } from "@blocknote/core";
import { ReactNode, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { FloatingUIOptions } from "./FloatingUIOptions.js";
import { GenericPopover, GenericPopoverReference } from "./GenericPopover.js";

export const BlockPopover = (
  props: FloatingUIOptions & {
    blockId: string | undefined;
    includeNestedBlocks?: boolean;
    children: ReactNode;
  },
) => {
  const { blockId, children, ...floatingUIOptions } = props;

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

        const blockElement = editor.prosemirrorView.domAtPos(
          nodePosInfo.posBeforeNode + 1,
        ).node;
        if (!(blockElement instanceof Element)) {
          return undefined;
        }

        if (props.includeNestedBlocks) {
          return {
            element: blockElement,
          };
        }

        const blockContentElement = blockElement.firstElementChild;
        if (blockContentElement === null) {
          return undefined;
        }

        return {
          element: blockContentElement,
          getBoundingClientRect: () => {
            const outerBlockGroupClientRect =
              editor.domElement?.firstElementChild?.getBoundingClientRect();
            if (outerBlockGroupClientRect === undefined) {
              throw new Error(
                "Root blockGroup element doesn't exist, yet descendant blockContent element does.",
              );
            }

            const blockContentBoundingClientRect =
              blockContentElement.getBoundingClientRect();

            return new DOMRect(
              outerBlockGroupClientRect.x,
              blockContentBoundingClientRect.y,
              outerBlockGroupClientRect.width,
              blockContentBoundingClientRect.height,
            );
          },
        };
      }),
    [editor, blockId, props.includeNestedBlocks],
  );

  return (
    <GenericPopover reference={reference} {...floatingUIOptions}>
      {blockId !== undefined && children}
    </GenericPopover>
  );
};
