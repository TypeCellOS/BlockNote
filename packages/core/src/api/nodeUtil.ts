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
import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import type { BlockSchema } from "../schema/index.js";
import type { InlineContentSchema } from "../schema/inlineContent/types.js";
import type { StyleSchema } from "../schema/styles/types.js";
import { nodeToBlock } from "./nodeConversions/nodeToBlock.js";

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
    if (!node.type.isInGroup("bnBlock") || node.attrs.id !== id) {
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
       */
      type: "undo" | "redo";
    }
  | {
      /**
       * When an event is triggered by a remote user, the source is "remote".
       */
      type: "yjs-remote";
      /**
       * Whether the change is from this client or another client.
       */
      isChangeOrigin: boolean;
      /**
       * Whether the change is an undo or redo operation.
       */
      isUndoRedoOperation: boolean;
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
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
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
    source = {
      type: "yjs-remote",
      isChangeOrigin: transaction.getMeta("y-sync$").isChangeOrigin,
      isUndoRedoOperation: transaction.getMeta("y-sync$").isUndoRedoOperation,
    };
  }

  const changes: BlocksChanged<BSchema, ISchema, SSchema> = [];
  const combinedTransaction = combineTransactionSteps(transaction.before, [
    transaction,
    ...appendedTransactions,
  ]);

  let prevAffectedBlocks: Block<BSchema, ISchema, SSchema>[] = [];
  let nextAffectedBlocks: Block<BSchema, ISchema, SSchema>[] = [];

  getChangedRanges(combinedTransaction).forEach((range) => {
    // All the blocks that were in the range before the transaction
    prevAffectedBlocks = prevAffectedBlocks.concat(
      ...findChildrenInRange(
        combinedTransaction.before,
        range.oldRange,
        (node) => node.type.isInGroup("bnBlock")
      ).map(({ node }) =>
        nodeToBlock(
          node,
          editor.schema.blockSchema,
          editor.schema.inlineContentSchema,
          editor.schema.styleSchema,
          editor.blockCache
        )
      )
    );
    // All the blocks that were in the range after the transaction
    nextAffectedBlocks = nextAffectedBlocks.concat(
      findChildrenInRange(combinedTransaction.doc, range.newRange, (node) =>
        node.type.isInGroup("bnBlock")
      ).map(({ node }) =>
        nodeToBlock(
          node,
          editor.schema.blockSchema,
          editor.schema.inlineContentSchema,
          editor.schema.styleSchema,
          editor.blockCache
        )
      )
    );
  });

  // de-duplicate by block ID
  const nextBlockIds = new Set(nextAffectedBlocks.map((block) => block.id));
  const prevBlockIds = new Set(prevAffectedBlocks.map((block) => block.id));

  // All blocks that are newly inserted (since they did not exist in the previous state)
  const addedBlockIds = Array.from(nextBlockIds).filter(
    (id) => !prevBlockIds.has(id)
  );

  addedBlockIds.forEach((blockId) => {
    changes.push({
      type: "insert",
      block: nextAffectedBlocks.find((block) => block.id === blockId)!,
      source,
      prevBlock: undefined,
    });
  });

  // All blocks that are newly removed (since they did not exist in the next state)
  const removedBlockIds = Array.from(prevBlockIds).filter(
    (id) => !nextBlockIds.has(id)
  );

  removedBlockIds.forEach((blockId) => {
    changes.push({
      type: "delete",
      block: prevAffectedBlocks.find((block) => block.id === blockId)!,
      source,
      prevBlock: undefined,
    });
  });

  // All blocks that are updated (since they exist in both the previous and next state)
  const updatedBlockIds = Array.from(nextBlockIds).filter((id) =>
    prevBlockIds.has(id)
  );

  updatedBlockIds.forEach((blockId) => {
    changes.push({
      type: "update",
      block: nextAffectedBlocks.find((block) => block.id === blockId)!,
      prevBlock: prevAffectedBlocks.find((block) => block.id === blockId)!,
      source,
    });
  });

  return changes;
}
