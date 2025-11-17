import { getNodeById } from "@blocknote/core";
import { ReactNode, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { FloatingUIOptions } from "./FloatingUIOptions.js";
import { GenericPopover } from "./GenericPopover.js";

export const BlockPopover = (
  props: FloatingUIOptions & {
    blockId: string | undefined;
    children: ReactNode;
  },
) => {
  const { blockId, children, ...rest } = props;

  const editor = useBlockNoteEditor<any, any, any>();

  // Seems like unlike with virtual elements, we don't need to use the last
  // defined reference element in case it's currently undefined. FloatingUI
  // appears to already do this internally.
  const element = useMemo(
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

        return node;
      }),
    [editor, blockId],
  );

  return (
    <GenericPopover reference={element} {...rest}>
      {children}
    </GenericPopover>
  );
};
