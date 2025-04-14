import type { Node } from "prosemirror-model";
import {
  NodeSelection,
  TextSelection,
  type Transaction,
} from "prosemirror-state";
import type { BlockCache } from "../../../../editor/BlockNoteEditor.js";
import type { BlockNoteSchema } from "../../../../editor/BlockNoteSchema.js";
import type { TextCursorPosition } from "../../../../editor/cursorPositionTypes.js";
import type {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { UnreachableCaseError } from "../../../../util/typescript.js";
import {
  getBlockInfo,
  getBlockInfoFromTransaction,
} from "../../../getBlockInfoFromPos.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../../nodeUtil.js";

export function getTextCursorPosition<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  tr: Transaction,
  schema: BlockNoteSchema<BSchema, I, S>,
  blockCache?: BlockCache
): TextCursorPosition<BSchema, I, S> {
  const { bnBlock } = getBlockInfoFromTransaction(tr);

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

  return {
    block: nodeToBlock(
      bnBlock.node,
      schema.blockSchema,
      schema.inlineContentSchema,
      schema.styleSchema,
      blockCache
    ),
    prevBlock:
      prevNode === null
        ? undefined
        : nodeToBlock(
            prevNode,
            schema.blockSchema,
            schema.inlineContentSchema,
            schema.styleSchema,
            blockCache
          ),
    nextBlock:
      nextNode === null
        ? undefined
        : nodeToBlock(
            nextNode,
            schema.blockSchema,
            schema.inlineContentSchema,
            schema.styleSchema,
            blockCache
          ),
    parentBlock:
      parentNode === undefined
        ? undefined
        : nodeToBlock(
            parentNode,
            schema.blockSchema,
            schema.inlineContentSchema,
            schema.styleSchema,
            blockCache
          ),
  };
}

export function setTextCursorPosition<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  tr: Transaction,
  schema: BlockNoteSchema<BSchema, I, S>,
  targetBlock: BlockIdentifier,
  placement: "start" | "end" = "start",
  blockCache?: BlockCache
) {
  const id = typeof targetBlock === "string" ? targetBlock : targetBlock.id;

  const posInfo = getNodeById(id, tr.doc);
  if (!posInfo) {
    throw new Error(`Block with ID ${id} not found`);
  }

  const info = getBlockInfo(posInfo);

  const contentType: "none" | "inline" | "table" =
    schema.blockSchema[info.blockNoteType]!.content;

  if (info.isBlockContainer) {
    const blockContent = info.blockContent;
    if (contentType === "none") {
      tr.setSelection(NodeSelection.create(tr.doc, blockContent.beforePos));
      return;
    }

    if (contentType === "inline") {
      if (placement === "start") {
        tr.setSelection(
          TextSelection.create(tr.doc, blockContent.beforePos + 1)
        );
      } else {
        tr.setSelection(
          TextSelection.create(tr.doc, blockContent.afterPos - 1)
        );
      }
    } else if (contentType === "table") {
      if (placement === "start") {
        // Need to offset the position as we have to get through the `tableRow`
        // and `tableCell` nodes to get to the `tableParagraph` node we want to
        // set the selection in.
        tr.setSelection(
          TextSelection.create(tr.doc, blockContent.beforePos + 4)
        );
      } else {
        tr.setSelection(
          TextSelection.create(tr.doc, blockContent.afterPos - 4)
        );
      }
    } else {
      throw new UnreachableCaseError(contentType);
    }
  } else {
    const child =
      placement === "start"
        ? info.childContainer.node.firstChild!
        : info.childContainer.node.lastChild!;

    setTextCursorPosition(tr, schema, child.attrs.id, placement, blockCache);
  }
}
