import { getNodeById } from "@blocknote/core";
import { ReactNode, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { FloatingUIOptions } from "./FloatingUIOptions.js";
import { GenericPopover, GenericPopoverReference } from "./GenericPopover.js";

export const BlockPopover = (
  props: FloatingUIOptions & {
    blockId: string | undefined;
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
    <GenericPopover reference={reference} {...floatingUIOptions}>
      {blockId !== undefined && children}
    </GenericPopover>
  );
};
