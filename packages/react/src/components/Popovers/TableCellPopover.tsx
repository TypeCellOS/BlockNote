import { getNodeById } from "@blocknote/core";
import { ReactNode, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { FloatingUIOptions } from "./FloatingUIOptions.js";
import { GenericPopover } from "./GenericPopover.js";

export const TableCellPopover = (
  props: FloatingUIOptions & {
    blockId: string | undefined;
    colIndex: number | undefined;
    rowIndex: number | undefined;
    children: ReactNode;
  },
) => {
  const { blockId, colIndex, rowIndex, children, ...floatingUIOptions } = props;

  const editor = useBlockNoteEditor<any, any, any>();

  const element = useMemo(() => {
    if (
      blockId === undefined ||
      colIndex === undefined ||
      rowIndex === undefined
    ) {
      return undefined;
    }

    // TODO use the location API for this
    const nodePosInfo = getNodeById(blockId, editor.prosemirrorState.doc);
    if (!nodePosInfo) {
      return undefined;
    }

    const tableBeforePos = nodePosInfo.posBeforeNode + 1;

    const rowBeforePos = editor.prosemirrorState.doc
      .resolve(tableBeforePos + 1)
      .posAtIndex(rowIndex || 0);
    const cellBeforePos = editor.prosemirrorState.doc
      .resolve(rowBeforePos + 1)
      .posAtIndex(colIndex || 0);

    const { node } = editor.prosemirrorView.domAtPos(cellBeforePos + 1);
    if (!(node instanceof Element)) {
      return undefined;
    }

    return node;
  }, [editor, blockId, colIndex, rowIndex]);

  return (
    <GenericPopover reference={element} {...floatingUIOptions}>
      {children}
    </GenericPopover>
  );
};
