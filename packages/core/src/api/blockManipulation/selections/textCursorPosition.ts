import type { Node } from "prosemirror-model";
import {
  NodeSelection,
  TextSelection,
  type Transaction,
} from "prosemirror-state";
import { tableContentType } from "../../../blocks/Table/block.js";
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

  // Gets the nearest enclosing bnBlock ancestor, if the current block is
  // nested. With the original block schema there's at most one non-bnBlock
  // wrapper between blocks (a `blockGroup`), but combinator content types
  // (e.g. `c.list` of records, or `c.list(c.props(c.blocks()))`) can nest
  // additional slot nodes between an inner `blockContainer` and the outer
  // one — so we walk up until we find a bnBlock or run out of depth.
  let parentNode: Node | undefined = undefined;
  for (let d = resolvedPos.depth; d > 0; d--) {
    const candidate = resolvedPos.node(d);
    if (candidate.type.isInGroup("bnBlock")) {
      parentNode = candidate;
      break;
    }
  }

  return {
    block: nodeToBlock(bnBlock.node, pmSchema),
    prevBlock: prevNode === null ? undefined : nodeToBlock(prevNode, pmSchema),
    nextBlock: nextNode === null ? undefined : nodeToBlock(nextNode, pmSchema),
    parentBlock:
      parentNode === undefined ? undefined : nodeToBlock(parentNode, pmSchema),
  };
}

export function setTextCursorPosition(
  tr: Transaction,
  targetBlock: BlockIdentifier,
  placement: "start" | "end" = "start",
) {
  const id = typeof targetBlock === "string" ? targetBlock : targetBlock.id;
  const pmSchema = getPmSchema(tr.doc);
  const schema = getBlockNoteSchema(pmSchema);

  const posInfo = getNodeById(id, tr.doc);
  if (!posInfo) {
    throw new Error(`Block with ID ${id} not found`);
  }

  const info = getBlockInfo(posInfo);

  const contentType = schema.blockSchema[info.blockNoteType]!.content;

  if (info.isBlockContainer) {
    const blockContent = info.blockContent;
    if (contentType === "none") {
      tr.setSelection(NodeSelection.create(tr.doc, blockContent.beforePos));
      return;
    }

    if (contentType === "inline") {
      if (placement === "start") {
        tr.setSelection(
          TextSelection.create(tr.doc, blockContent.beforePos + 1),
        );
      } else {
        tr.setSelection(
          TextSelection.create(tr.doc, blockContent.afterPos - 1),
        );
      }
    } else if (contentType === tableContentType) {
      if (placement === "start") {
        // Need to offset the position as we have to get through the `tableRow`
        // and `tableCell` nodes to get to the `tableParagraph` node we want to
        // set the selection in.
        tr.setSelection(
          TextSelection.create(tr.doc, blockContent.beforePos + 4),
        );
      } else {
        tr.setSelection(
          TextSelection.create(tr.doc, blockContent.afterPos - 4),
        );
      }
    } else {
      throw new UnreachableCaseError(contentType as never);
    }
  } else {
    const child =
      placement === "start"
        ? info.childContainer.node.firstChild!
        : info.childContainer.node.lastChild!;

    setTextCursorPosition(tr, child.attrs.id, placement);
  }
}
