import { combineTransactionSteps } from "@tiptap/core";
import deepEqual from "fast-deep-equal";
import type { Node } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import {
  Block,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "../blocks/defaultBlocks.js";
import type { BlockSchema } from "../schema/index.js";
import type { InlineContentSchema } from "../schema/inlineContent/types.js";
import type { StyleSchema } from "../schema/styles/types.js";
import { getChangedRange } from "./getChangedRange.js";
import { getNodeId } from "./getBlockInfoFromPos.js";
import { nodeToBlock } from "./nodeConversions/nodeToBlock.js";
import { isNodeBlock } from "./nodeUtil.js";

/**
 * Change detection utilities for BlockNote.
 *
 * High-level algorithm used by getBlocksChangedByTransaction:
 * 1) Merge appended transactions into one document change.
 * 2) Compute the single range the transaction touched (in both the old and new
 *    doc) and only snapshot blocks within it, rather than walking the whole
 *    document. getChanges() runs per transaction, so a full-document snapshot
 *    made typing in large documents slow: every keystroke re-converted every block.
 * 3) Snapshot blocks before and after within that range (flat map by id, and
 *    per-parent child order).
 * 4) Emit inserts/deletes by diffing ids; for shared ids, emit a move (parent
 *    changed) or update (block changed, ignoring children).
 * 5) Detect same-parent sibling reorders via an O(n log n) LIS in
 *    detectReorderedChildren, marking only items outside the longest ordered
 *    subsequence as moved.
 *
 * The range suffices because `changedRange()` spans from the first to the last
 * changed position: any inserted/deleted/moved/updated/reordered block has its
 * relevant positions inside it, and blocks outside are byte-for-byte identical in
 * the same relative order. A moved block's parent contains it, so the parent
 * overlaps the range too (and nodeToBlock converts its full subtree regardless).
 */
/**
 * Gets the parent block of a node, if it has one.
 */
function getParentBlockId(doc: Node, pos: number): string | undefined {
  if (pos === 0) {
    return undefined;
  }
  const resolvedPos = doc.resolve(pos);
  for (let i = resolvedPos.depth; i > 0; i--) {
    const parent = resolvedPos.node(i);
    if (isNodeBlock(parent)) {
      return getNodeId(parent, doc);
    }
  }
  return undefined;
}

/**
 * This attributes the changes to a specific source.
 */
export type BlockChangeSource =
  | { type: "local" }
  | { type: "paste" }
  | { type: "drop" }
  | { type: "undo" | "redo" | "undo-redo" }
  | { type: "yjs-remote" };

export type BlocksChanged<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema,
> = Array<
  {
    /**
     * The affected block.
     */
    block: Block<BSchema, ISchema, SSchema>;
    /**
     * The source of the change.
     */
    source: BlockChangeSource;
  } & (
    | {
        type: "insert" | "delete";
        /**
         * Insert and delete changes don't have a previous block.
         */
        prevBlock: undefined;
      }
    | {
        type: "update";
        /**
         * The previous block.
         */
        prevBlock: Block<BSchema, ISchema, SSchema>;
      }
    | {
        type: "move";
        /**
         * The affected block.
         */
        block: Block<BSchema, ISchema, SSchema>;
        /**
         * The block before the move.
         */
        prevBlock: Block<BSchema, ISchema, SSchema>;
        /**
         * The previous parent block (if it existed).
         */
        prevParent?: Block<BSchema, ISchema, SSchema>;
        /**
         * The current parent block (if it exists).
         */
        currentParent?: Block<BSchema, ISchema, SSchema>;
      }
  )
>;

function determineChangeSource(transaction: Transaction): BlockChangeSource {
  if (transaction.getMeta("paste")) {
    return { type: "paste" };
  }
  if (transaction.getMeta("uiEvent") === "drop") {
    return { type: "drop" };
  }
  if (transaction.getMeta("history$")) {
    return {
      type: transaction.getMeta("history$").redo ? "redo" : "undo",
    };
  }
  if (transaction.getMeta("y-sync$")) {
    if (transaction.getMeta("y-sync$").isUndoRedoOperation) {
      return { type: "undo-redo" };
    }
    return { type: "yjs-remote" };
  }
  return { type: "local" };
}

type BlockSnapshot<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
> = {
  byId: Record<
    string,
    {
      block: Block<BSchema, ISchema, SSchema>;
      parentId: string | undefined;
    }
  >;
  childrenByParent: Record<string, string[]>;
};

/**
 * Snapshots blocks and per-parent child order for the block nodes overlapping the
 * given range (uses "__root__" for the root level). Traversing only the range is
 * what keeps this cheap per keystroke: nodeToBlock runs only for blocks that could
 * have changed.
 */
function collectSnapshot<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  doc: Node,
  range: { from: number; to: number },
): BlockSnapshot<BSchema, ISchema, SSchema> {
  const ROOT_KEY = "__root__";
  const byId: Record<
    string,
    {
      block: Block<BSchema, ISchema, SSchema>;
      parentId: string | undefined;
    }
  > = {};
  const childrenByParent: Record<string, string[]> = {};
  // Clamp to valid positions; nodesBetween throws on out-of-range ones.
  const from = Math.max(0, Math.min(range.from, doc.content.size));
  const to = Math.max(from, Math.min(range.to, doc.content.size));
  // nodesBetween visits every node overlapping [from, to] in document order,
  // including ancestor blocks that contain the range.
  doc.nodesBetween(from, to, (node, pos) => {
    if (!isNodeBlock(node)) {
      return true;
    }
    const parentId = getParentBlockId(doc, pos);
    const key = parentId ?? ROOT_KEY;
    if (!childrenByParent[key]) {
      childrenByParent[key] = [];
    }
    const block = nodeToBlock(node, doc);
    const nodeId = getNodeId(node, doc);
    byId[nodeId] = { block, parentId };
    childrenByParent[key].push(nodeId);
    return true;
  });
  return { byId, childrenByParent };
}

/**
 * Determines which child ids have been reordered (moved) within the same parent.
 * Uses LIS to keep the longest ordered subsequence and marks the rest as moved.
 */
function detectReorderedChildren(
  prevOrder: string[] | undefined,
  nextOrder: string[] | undefined,
): Set<string> {
  const moved = new Set<string>();
  if (!prevOrder || !nextOrder) {
    return moved;
  }
  // Consider only ids present in both orders (ignore inserts/deletes handled elsewhere)
  const prevIds = new Set(prevOrder);
  const commonNext: string[] = nextOrder.filter((id) => prevIds.has(id));
  const commonPrev: string[] = prevOrder.filter((id) =>
    commonNext.includes(id),
  );

  if (commonPrev.length <= 1 || commonNext.length <= 1) {
    return moved;
  }

  // Map ids to their index in previous order
  const indexInPrev: Record<string, number> = {};
  for (let i = 0; i < commonPrev.length; i++) {
    indexInPrev[commonPrev[i]] = i;
  }

  // Build sequence of indices representing next order in terms of previous indices
  const sequence: number[] = commonNext.map((id) => indexInPrev[id]);

  // Inline O(n log n) LIS with reconstruction.
  // Why LIS? We want the smallest set of siblings to label as "moved".
  // Keeping the longest subsequence that is already in order achieves this,
  // so only items outside the LIS are reported as moves.
  const n = sequence.length;
  const tailsValues: number[] = [];
  const tailsEndsAtIndex: number[] = [];
  const previousIndexInLis: number[] = new Array(n).fill(-1);

  const lowerBound = (arr: number[], target: number): number => {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (arr[mid] < target) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  };

  for (let i = 0; i < n; i++) {
    const value = sequence[i];
    const pos = lowerBound(tailsValues, value);
    if (pos > 0) {
      previousIndexInLis[i] = tailsEndsAtIndex[pos - 1];
    }
    if (pos === tailsValues.length) {
      tailsValues.push(value);
      tailsEndsAtIndex.push(i);
    } else {
      tailsValues[pos] = value;
      tailsEndsAtIndex[pos] = i;
    }
  }

  const lisIndexSet = new Set<number>();
  let k = tailsEndsAtIndex[tailsEndsAtIndex.length - 1] ?? -1;
  while (k !== -1) {
    lisIndexSet.add(k);
    k = previousIndexInLis[k];
  }

  // Items not part of LIS are considered moved
  for (let i = 0; i < commonNext.length; i++) {
    if (!lisIndexSet.has(i)) {
      moved.add(commonNext[i]);
    }
  }
  return moved;
}

/**
 * Get the blocks that were changed by a transaction.
 */
export function getBlocksChangedByTransaction<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema,
>(
  transaction: Transaction,
  appendedTransactions: Transaction[] = [],
): BlocksChanged<BSchema, ISchema, SSchema> {
  const source = determineChangeSource(transaction);
  const combinedTransaction = combineTransactionSteps(transaction.before, [
    transaction,
    ...appendedTransactions,
  ]);

  // Changed range in the new doc; null means nothing changed.
  const newRange = getChangedRange(combinedTransaction);
  if (!newRange) {
    return [];
  }
  // Map it back to old-doc coordinates. The -1/+1 biases expand outwards so that
  // for pure inserts/deletes (collapsed new range) the old range still covers the
  // affected span.
  const invertedMapping = combinedTransaction.mapping.invert();
  const oldRange = {
    from: invertedMapping.map(newRange.from, -1),
    to: invertedMapping.map(newRange.to, 1),
  };

  const prevSnap = collectSnapshot<BSchema, ISchema, SSchema>(
    combinedTransaction.before,
    oldRange,
  );
  const nextSnap = collectSnapshot<BSchema, ISchema, SSchema>(
    combinedTransaction.doc,
    newRange,
  );

  const changes: BlocksChanged<BSchema, ISchema, SSchema> = [];
  const changedIds = new Set<string>();

  // Handle inserted blocks
  Object.keys(nextSnap.byId)
    .filter((id) => !(id in prevSnap.byId))
    .forEach((id) => {
      changes.push({
        type: "insert",
        block: nextSnap.byId[id].block,
        source,
        prevBlock: undefined,
      });
      changedIds.add(id);
    });

  // Handle deleted blocks
  Object.keys(prevSnap.byId)
    .filter((id) => !(id in nextSnap.byId))
    .forEach((id) => {
      changes.push({
        type: "delete",
        block: prevSnap.byId[id].block,
        source,
        prevBlock: undefined,
      });
      changedIds.add(id);
    });

  // Handle updated, moved to different parent, indented, outdented blocks
  Object.keys(nextSnap.byId)
    .filter((id) => id in prevSnap.byId)
    .forEach((id) => {
      const prev = prevSnap.byId[id];
      const next = nextSnap.byId[id];
      const isParentDifferent = prev.parentId !== next.parentId;

      if (isParentDifferent) {
        changes.push({
          type: "move",
          block: next.block,
          prevBlock: prev.block,
          source,
          prevParent: prev.parentId
            ? prevSnap.byId[prev.parentId]?.block
            : undefined,
          currentParent: next.parentId
            ? nextSnap.byId[next.parentId]?.block
            : undefined,
        });
        changedIds.add(id);
      } else if (
        // Compare blocks while ignoring children to avoid reporting a parent
        // update when only descendants changed.
        !deepEqual(
          { ...prev.block, children: undefined } as any,
          { ...next.block, children: undefined } as any,
        )
      ) {
        changes.push({
          type: "update",
          block: next.block,
          prevBlock: prev.block,
          source,
        });
        changedIds.add(id);
      }
    });

  // Handle sibling reorders (parent unchanged but relative order changed)
  const prevOrderByParent = prevSnap.childrenByParent;
  const nextOrderByParent = nextSnap.childrenByParent;

  // Use a special key for root-level siblings
  const ROOT_KEY = "__root__";
  const parents = new Set<string>([
    ...Object.keys(prevOrderByParent),
    ...Object.keys(nextOrderByParent),
  ]);

  const addedMoveForId = new Set<string>();

  parents.forEach((parentKey) => {
    const movedWithinParent = detectReorderedChildren(
      prevOrderByParent[parentKey],
      nextOrderByParent[parentKey],
    );
    if (movedWithinParent.size === 0) {
      return;
    }
    movedWithinParent.forEach((id) => {
      // Only consider ids that exist in both snapshots and whose parent truly did not change
      const prev = prevSnap.byId[id];
      const next = nextSnap.byId[id];
      if (!prev || !next) {
        return;
      }
      if (prev.parentId !== next.parentId) {
        return;
      }
      // Skip if already accounted for by insert/delete/update/parent move
      if (changedIds.has(id)) {
        return;
      }
      // Verify we're addressing the right parent bucket
      const bucketKey = prev.parentId ?? ROOT_KEY;
      if (bucketKey !== parentKey) {
        return;
      }
      if (addedMoveForId.has(id)) {
        return;
      }
      addedMoveForId.add(id);
      changes.push({
        type: "move",
        block: next.block,
        prevBlock: prev.block,
        source,
        prevParent: prev.parentId
          ? prevSnap.byId[prev.parentId]?.block
          : undefined,
        currentParent: next.parentId
          ? nextSnap.byId[next.parentId]?.block
          : undefined,
      });
      changedIds.add(id);
    });
  });

  return changes;
}
