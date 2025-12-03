import { getNodeById } from "@blocknote/core";
import { ReactNode, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { FloatingUIOptions } from "./FloatingUIOptions.js";
import { GenericPopover, GenericPopoverReference } from "./GenericPopover.js";

export const BlockPopover = (
  props: FloatingUIOptions & {
    blockId: string | undefined;
    spanEditorWidth?: boolean;
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

        const blockContentElement = blockElement.firstElementChild;
        if (!(blockContentElement instanceof Element)) {
          return undefined;
        }

        const element =
          props.includeNestedBlocks === false
            ? blockContentElement
            : blockElement;

        if (props.spanEditorWidth) {
          return {
            element,
            getBoundingClientRect: () => {
              const boundingClientRect = element.getBoundingClientRect();

              const outerBlockGroupElement =
                editor.domElement?.firstElementChild;
              if (!(outerBlockGroupElement instanceof Element)) {
                return undefined;
              }

              const outerBlockGroupBoundingClientRect =
                outerBlockGroupElement.getBoundingClientRect();

              return new DOMRect(
                outerBlockGroupBoundingClientRect.x,
                boundingClientRect.y,
                outerBlockGroupBoundingClientRect.width,
                boundingClientRect.height,
              );
            },
          };
        }

        return { element };
      }),
    [editor, blockId, props.includeNestedBlocks, props.spanEditorWidth],
  );

  return (
    <GenericPopover reference={reference} {...floatingUIOptions}>
      {blockId !== undefined && children}
    </GenericPopover>
  );
};
