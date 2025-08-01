import type { Node } from "prosemirror-model";
import {
  NodeSelection,
  TextSelection,
  type Transaction,
} from "prosemirror-state";
import type { TextCursorPosition } from "../../../editor/cursorPositionTypes.js";
import type {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { UnreachableCaseError } from "../../../util/typescript.js";
import {
  getBlockInfo,
  getBlockInfoFromTransaction,
} from "../../getBlockInfoFromPos.js";
import { nodeToBlock } from "../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../nodeUtil.js";
import { getBlockNoteSchema, getPmSchema } from "../../pmUtil.js";

export function getTextCursorPosition<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(tr: Transaction): TextCursorPosition<BSchema, I, S> {
  const { bnBlock } = getBlockInfoFromTransaction(tr);
  const pmSchema = getPmSchema(tr.doc);

  const resolvedPos = tr.doc.resolve(bnBlock.beforePos);
  // Gets previous blockContainer node at the same nesting level, if the current node isn't the first child.
  const prevNode = resolvedPos.nodeBefore;

  // Gets next blockContainer node at the same nesting level, if the current node isn't the last child.
  const nextNode = tr.doc.resolve(bnBlock.afterPos).nodeAfter;

  // Gets parent blockContainer node, if the current node is nested.
  let parentNode: Node | undefined = undefined;
  if (resolvedPos.depth > 1) {
    // for nodes nested in bnBlocks
    parentNode = resolvedPos.node();
    if (!parentNode.type.isInGroup("bnBlock")) {
      // for blockGroups, we need to go one level up
      parentNode = resolvedPos.node(resolvedPos.depth - 1);
    }
  }

  // Compute the offset of the cursor within the block’s inline content.  We do
  // this by determining the type of content the block holds and then
  // calculating the difference between the selection’s anchor position and the
  // start of the block’s content.
  let offset = 0;
  try {
    const info = getBlockInfoFromTransaction(tr);
    const pmSchemaForOffset = getPmSchema(tr.doc);
    const schema = getBlockNoteSchema(pmSchemaForOffset);
    const contentType = schema.blockSchema[info.blockNoteType]!.content;
    let basePos: number | undefined;
    if (info.isBlockContainer) {
      const blockContent = info.blockContent;
      if (contentType === "inline") {
        // Inline content starts immediately after the opening of the blockContent
        basePos = blockContent.beforePos + 1;
      } else if (contentType === "table") {
        // Table content starts a few positions after blockContent to skip table wrappers
        basePos = blockContent.beforePos + 4;
      } else if (contentType === "none") {
        // Blocks with no inline content have the cursor anchored at the blockContent itself
        basePos = blockContent.beforePos;
      }
    } else {
      // For wrapper nodes (e.g. columns) there is no meaningful inline offset;
      // use the childContainer as a reference if available.
      // ChildContainer holds the block’s children; we assume the first child’s
      // content starts one position after the container.
      const childContainer = (info as any).childContainer;
      if (childContainer && childContainer.beforePos !== undefined) {
        basePos = childContainer.beforePos + 1;
      }
    }
    if (basePos !== undefined) {
      offset = tr.selection.anchor - basePos;
      if (offset < 0) {
        offset = 0;
      }
    }
  } catch (e) {
    // In case of any unexpected errors during offset computation, default to 0.
    offset = 0;
  }

  return {
    block: nodeToBlock(bnBlock.node, pmSchema),
    prevBlock: prevNode === null ? undefined : nodeToBlock(prevNode, pmSchema),
    nextBlock: nextNode === null ? undefined : nodeToBlock(nextNode, pmSchema),
    parentBlock:
      parentNode === undefined ? undefined : nodeToBlock(parentNode, pmSchema),
    offset,
  };
}

/**
 * Places the text cursor within a block. By default you can specify
 * "start" or "end" to move the cursor to the beginning or end of the block.
 * Alternatively, pass a numeric offset to place the cursor that many
 * characters into the block’s inline content. Offsets beyond the block’s
 * length will be clamped to the end of the block.
 *
 * @param tr The ProseMirror transaction.
 * @param targetBlock Identifier of the block to move the cursor into.
 * @param placementOrOffset Either "start", "end", or a zero‑based offset.
 */
export function setTextCursorPosition(
  tr: Transaction,
  targetBlock: BlockIdentifier,
  placementOrOffset: "start" | "end" | number = "start",
) {
  const id = typeof targetBlock === "string" ? targetBlock : targetBlock.id;
  const pmSchema = getPmSchema(tr.doc);
  const schema = getBlockNoteSchema(pmSchema);

  const posInfo = getNodeById(id, tr.doc);
  if (!posInfo) {
    throw new Error(`Block with ID ${id} not found`);
  }

  const info = getBlockInfo(posInfo);

  const contentType: "none" | "inline" | "table" =
    schema.blockSchema[info.blockNoteType]!.content;

  if (info.isBlockContainer) {
    const blockContent = info.blockContent;
    // Handle blocks that have no inline content
    if (contentType === "none") {
      tr.setSelection(NodeSelection.create(tr.doc, blockContent.beforePos));
      return;
    }

    // Determine base position for inline or table content
    let basePos: number;
    if (contentType === "inline") {
      basePos = blockContent.beforePos + 1;
    } else if (contentType === "table") {
      basePos = blockContent.beforePos + 4;
    } else {
      throw new UnreachableCaseError(contentType);
    }

    // Determine target position
    let targetPos: number;
    if (typeof placementOrOffset === "number") {
      // Clamp the offset to the range of the block’s content
      const maxOffset = blockContent.afterPos - basePos - 1;
      const offset = Math.max(0, Math.min(placementOrOffset, maxOffset));
      targetPos = basePos + offset;
    } else if (placementOrOffset === "start") {
      targetPos = basePos;
    } else {
      // end
      if (contentType === "inline") {
        targetPos = blockContent.afterPos - 1;
      } else if (contentType === "table") {
        targetPos = blockContent.afterPos - 4;
      } else {
        throw new UnreachableCaseError(contentType);
      }
    }
    tr.setSelection(TextSelection.create(tr.doc, targetPos));
  } else {
    // For wrapper nodes, delegate to the first or last child when using start/end.
    const isNumberPlacement = typeof placementOrOffset === "number";
    const child = !isNumberPlacement && placementOrOffset === "end"
      ? info.childContainer.node.lastChild!
      : info.childContainer.node.firstChild!;
    if (isNumberPlacement) {
      // For numeric offsets inside wrapper nodes, we cannot determine a meaningful
      // character position at this level, so recurse into the first child with the same offset.
      setTextCursorPosition(tr, child.attrs.id, placementOrOffset);
    } else {
      setTextCursorPosition(tr, child.attrs.id, placementOrOffset);
    }
  }
}
