import { combineTransactionSteps } from "@tiptap/core";
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
      return parent.attrs.id;
    }
  }
  return undefined;
}

/**
 * Get a TipTap node by id
 */
export function getNodeById(
  id: string,
  doc: Node,
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

/**
 * Compares two blocks, ignoring their children.
 * Returns true if the blocks are different (excluding children).
 */
function areBlocksDifferentExcludingChildren<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  block1: Block<BSchema, ISchema, SSchema>,
  block2: Block<BSchema, ISchema, SSchema>,
): boolean {
  return (
    block1.id !== block2.id ||
    block1.type !== block2.type ||
    JSON.stringify(block1.props) !== JSON.stringify(block2.props) ||
    JSON.stringify(block1.content) !== JSON.stringify(block2.content)
  );
}

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

function collectAllBlocks<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  doc: Node,
): Record<
  string,
  {
    block: Block<BSchema, ISchema, SSchema>;
    parentId: string | undefined;
  }
> {
  const blocks: Record<
    string,
    {
      block: Block<BSchema, ISchema, SSchema>;
      parentId: string | undefined;
    }
  > = {};
  const pmSchema = getPmSchema(doc);
  doc.descendants((node, pos) => {
    if (isNodeBlock(node)) {
      const parentId = getParentBlockId(doc, pos);
      blocks[node.attrs.id] = {
        block: nodeToBlock(node, pmSchema),
        parentId,
      };
    }
    return true;
  });
  return blocks;
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

  const prevBlocks = collectAllBlocks<BSchema, ISchema, SSchema>(
    combinedTransaction.before,
  );
  const nextBlocks = collectAllBlocks<BSchema, ISchema, SSchema>(
    combinedTransaction.doc,
  );

  const changes: BlocksChanged<BSchema, ISchema, SSchema> = [];

  // Handle inserted blocks
  Object.keys(nextBlocks)
    .filter((id) => !(id in prevBlocks))
    .forEach((id) => {
      changes.push({
        type: "insert",
        block: nextBlocks[id].block,
        source,
        prevBlock: undefined,
      });
    });

  // Handle deleted blocks
  Object.keys(prevBlocks)
    .filter((id) => !(id in nextBlocks))
    .forEach((id) => {
      changes.push({
        type: "delete",
        block: prevBlocks[id].block,
        source,
        prevBlock: undefined,
      });
    });

  // Handle updated, moved, indented, outdented blocks
  Object.keys(nextBlocks)
    .filter((id) => id in prevBlocks)
    .forEach((id) => {
      const prev = prevBlocks[id];
      const next = nextBlocks[id];
      const isParentDifferent = prev.parentId !== next.parentId;

      if (isParentDifferent) {
        changes.push({
          type: "move",
          block: next.block,
          prevBlock: prev.block,
          source,
          prevParent: prev.parentId
            ? prevBlocks[prev.parentId]?.block
            : undefined,
          currentParent: next.parentId
            ? nextBlocks[next.parentId]?.block
            : undefined,
        });
      } else if (areBlocksDifferentExcludingChildren(prev.block, next.block)) {
        changes.push({
          type: "update",
          block: next.block,
          prevBlock: prev.block,
          source,
        });
      }
    });

  return changes;
}
