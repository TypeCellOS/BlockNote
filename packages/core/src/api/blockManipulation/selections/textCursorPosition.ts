import { type Transaction } from "prosemirror-state";
import type { TextCursorPosition } from "../../../editor/cursorPositionTypes.js";
import type {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import {
  blockEdgeSelection,
  getBlockInfoFromNode,
  getBlockInfoFromSelection,
  getParentBlockInfo,
} from "../../getBlockInfoFromPos.js";
import { nodeToBlock } from "../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../nodeUtil.js";

export function getTextCursorPosition<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(tr: Transaction): TextCursorPosition<BSchema, I, S> {
  const { block } = getBlockInfoFromSelection(tr);

  const resolvedPos = tr.doc.resolve(block.beforePos);
  // Gets previous blockContainer node at the same nesting level, if the current node isn't the first child.
  const prevNode = resolvedPos.nodeBefore;

  // Gets next blockContainer node at the same nesting level, if the current node isn't the last child.
  const nextNode = tr.doc.resolve(block.afterPos).nodeAfter;

  // Gets the parent block's node, if the current block is nested.
  const parentNode = getParentBlockInfo(tr.doc, block.beforePos)?.block.node;

  return {
    block: nodeToBlock(block.node, tr.doc),
    prevBlock: prevNode === null ? undefined : nodeToBlock(prevNode, tr.doc),
    nextBlock: nextNode === null ? undefined : nodeToBlock(nextNode, tr.doc),
    parentBlock:
      parentNode === undefined ? undefined : nodeToBlock(parentNode, tr.doc),
  };
}

export function setTextCursorPosition(
  tr: Transaction,
  targetBlock: BlockIdentifier,
  placement: "start" | "end" = "start",
) {
  const id = typeof targetBlock === "string" ? targetBlock : targetBlock.id;

  const posInfo = getNodeById(id, tr.doc);
  if (!posInfo) {
    throw new Error(`Block with ID ${id} not found`);
  }

  tr.setSelection(
    blockEdgeSelection(
      tr.doc,
      getBlockInfoFromNode(posInfo.node, posInfo.posBeforeNode),
      placement,
    ),
  );
}
