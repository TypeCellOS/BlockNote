import {
  combineTransactionSteps,
  findChildrenInRange,
  getChangedRanges,
} from "@tiptap/core";
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
import { nodeToBlock } from "./nodeConversions/nodeToBlock.js";
import { getPmSchema } from "./pmUtil.js";

/**
 * Get a TipTap node by id
 */
export function getNodeById(
  id: string,
  doc: Node
): { node: Node; posBeforeNode: number } | undefined {
  let targetNode: Node | undefined = undefined;
  let posBeforeNode: number | undefined = undefined;

  doc.firstChild!.descendants((node, pos) => {
    // Skips traversing nodes after node with target ID has been found.
    if (targetNode) {
      return false;
    }

    // Keeps traversing nodes if block with target ID has not been found.
    if (!isNodeBlock(node) || node.attrs.id !== id) {
      return true;
    }

    targetNode = node;
    posBeforeNode = pos + 1;

    return false;
  });

  if (targetNode === undefined || posBeforeNode === undefined) {
    return undefined;
  }

  return {
    node: targetNode,
    posBeforeNode: posBeforeNode,
  };
}

export function isNodeBlock(node: Node): boolean {
  return node.type.isInGroup("bnBlock");
}

/**
 * This attributes the changes to a specific source.
 */
export type BlockChangeSource =
  | {
      /**
       * When an event is triggered by the local user, the source is "local".
       * This is the default source.
       */
      type: "local";
    }
  | {
      /**
       * When an event is triggered by a paste operation, the source is "paste".
       */
      type: "paste";
    }
  | {
      /**
       * When an event is triggered by a drop operation, the source is "drop".
       */
      type: "drop";
    }
  | {
      /**
       * When an event is triggered by an undo or redo operation, the source is "undo" or "redo".
       * @note Y.js undo/redo are not differentiated.
       */
      type: "undo" | "redo" | "undo-redo";
    }
  | {
      /**
       * When an event is triggered by a remote user, the source is "remote".
       */
      type: "yjs-remote";
    };

export type BlocksChanged<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema
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
         * The block before the update.
         */
        prevBlock: Block<BSchema, ISchema, SSchema>;
      }
  )
>;

/**
 * Compares two blocks, ignoring their children.
 * Returns true if the blocks are different (excluding children).
 */
function areBlocksDifferentExcludingChildren<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  block1: Block<BSchema, ISchema, SSchema>,
  block2: Block<BSchema, ISchema, SSchema>
): boolean {
  // TODO use an actual diff algorithm
  // Compare all properties except children
  return (
    block1.id !== block2.id ||
    block1.type !== block2.type ||
    JSON.stringify(block1.props) !== JSON.stringify(block2.props) ||
    JSON.stringify(block1.content) !== JSON.stringify(block2.content)
  );
}

/**
 * Get the blocks that were changed by a transaction.
 * @param transaction The transaction to get the changes from.
 * @param editor The editor to get the changes from.
 * @returns The blocks that were changed by the transaction.
 */
export function getBlocksChangedByTransaction<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema
>(
  transaction: Transaction,
  appendedTransactions: Transaction[] = []
): BlocksChanged<BSchema, ISchema, SSchema> {
  let source: BlockChangeSource = { type: "local" };

  if (transaction.getMeta("paste")) {
    source = { type: "paste" };
  } else if (transaction.getMeta("uiEvent") === "drop") {
    source = { type: "drop" };
  } else if (transaction.getMeta("history$")) {
    source = {
      type: transaction.getMeta("history$").redo ? "redo" : "undo",
    };
  } else if (transaction.getMeta("y-sync$")) {
    if (transaction.getMeta("y-sync$").isUndoRedoOperation) {
      source = {
        type: "undo-redo",
      };
    } else {
      source = {
        type: "yjs-remote",
      };
    }
  }

  // Get affected blocks before and after the change
  const pmSchema = getPmSchema(transaction);
  const combinedTransaction = combineTransactionSteps(transaction.before, [
    transaction,
    ...appendedTransactions,
  ]);

  const changedRanges = getChangedRanges(combinedTransaction);
  const prevAffectedBlocks = changedRanges
    .flatMap((range) => {
      return findChildrenInRange(
        combinedTransaction.before,
        range.oldRange,
        isNodeBlock
      );
    })
    .map(({ node }) => nodeToBlock(node, pmSchema));

  const nextAffectedBlocks = changedRanges
    .flatMap((range) => {
      return findChildrenInRange(
        combinedTransaction.doc,
        range.newRange,
        isNodeBlock
      );
    })
    .map(({ node }) => nodeToBlock(node, pmSchema));

  const nextBlocks = new Map(
    nextAffectedBlocks.map((block) => {
      return [block.id, block];
    })
  );
  const prevBlocks = new Map(
    prevAffectedBlocks.map((block) => {
      return [block.id, block];
    })
  );

  const changes: BlocksChanged<BSchema, ISchema, SSchema> = [];

  // Inserted blocks are blocks that were not in the previous state and are in the next state
  for (const [id, block] of nextBlocks) {
    if (!prevBlocks.has(id)) {
      changes.push({
        type: "insert",
        block,
        source,
        prevBlock: undefined,
      });
    }
  }

  // Deleted blocks are blocks that were in the previous state but not in the next state
  for (const [id, block] of prevBlocks) {
    if (!nextBlocks.has(id)) {
      changes.push({
        type: "delete",
        block,
        source,
        prevBlock: undefined,
      });
    }
  }

  // Updated blocks are blocks that were in the previous state and are in the next state
  for (const [id, block] of nextBlocks) {
    if (prevBlocks.has(id)) {
      const prevBlock = prevBlocks.get(id)!;

      // Only include the update if the block itself changed (excluding children)
      if (areBlocksDifferentExcludingChildren(prevBlock, block)) {
        changes.push({
          type: "update",
          block,
          prevBlock,
          source,
        });
      }
    }
  }

  return changes;
}
