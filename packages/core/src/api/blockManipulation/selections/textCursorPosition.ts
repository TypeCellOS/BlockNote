import type { Node } from "prosemirror-model";
import { TextSelection, type Transaction } from "prosemirror-state";
import type { TextCursorPosition } from "../../../editor/cursorPositionTypes.js";
import {
  getBlockEndPos,
  getBlockStartPos,
  resolveLocationToPM,
  resolvePMToLocation,
} from "../../../locations/location.js";
import { Location } from "../../../locations/types.js";
import {
  isPointingToBlock,
  normalizeToRange,
} from "../../../locations/utils.js";
import type {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { getBlockInfoFromTransaction } from "../../getBlockInfoFromPos.js";
import { nodeToBlock } from "../../nodeConversions/nodeToBlock.js";

export function getTextCursorPosition<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(tr: Transaction): TextCursorPosition<BSchema, I, S> {
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

  const location = resolvePMToLocation(tr.doc, {
    anchor: tr.selection.anchor,
    head: tr.selection.head,
  });

  return {
    meta: { location },
    range: normalizeToRange(location),
    block: nodeToBlock(bnBlock.node),
    prevBlock: prevNode === null ? undefined : nodeToBlock(prevNode),
    nextBlock: nextNode === null ? undefined : nodeToBlock(nextNode),
    parentBlock: parentNode === undefined ? undefined : nodeToBlock(parentNode),
  };
}

export function setTextCursorPosition(
  tr: Transaction,
  location: Location,
  placement: "start" | "end" = "start",
) {
  if (isPointingToBlock(location)) {
    if (placement === "start") {
      const loc = getBlockStartPos(tr.doc, location);
      tr.setSelection(TextSelection.near(tr.doc.resolve(loc)));
      return;
    } else {
      const loc = getBlockEndPos(tr.doc, location);
      tr.setSelection(TextSelection.near(tr.doc.resolve(loc), -1));
      return;
    }
  }

  const resolved = resolveLocationToPM(tr.doc, location);
  tr.setSelection(
    TextSelection.between(
      tr.doc.resolve(resolved.anchor),
      tr.doc.resolve(resolved.head),
    ),
  );
}
