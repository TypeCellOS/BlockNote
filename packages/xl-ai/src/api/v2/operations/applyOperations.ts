import {
  type BlockNoteEditor,
  getNodeById,
  inlineContentToNodes,
} from "@blocknote/core";
import { Fragment } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import type { Step } from "prosemirror-transform";

import type { LensPartialBlock } from "../blocks/types.js";
import { addInlineContentSteps } from "./inlineSteps.js";
import type { BlockOperation } from "./types.js";

/**
 * Applies the operations to the editor in sequence, in one transaction.
 * Returns the ProseMirror steps of the transaction.
 */
export function applyBlockOperations(
  editor: BlockNoteEditor<any, any, any>,
  operations: readonly BlockOperation[],
): readonly Step[] {
  if (operations.length === 0) {
    return [];
  }

  return editor.transact((tr) => {
    for (const operation of operations) {
      switch (operation.type) {
        case "update":
          updateBlock(editor, tr, operation.id, operation.update);
          break;
        case "insert":
          editor.insertBlocks(
            [operation.block],
            operation.reference,
            operation.placement,
          );
          break;
        case "move": {
          const block = editor.getBlock(operation.id);
          if (block === undefined) {
            throw new Error(`Block ${operation.id} to move not found`);
          }
          editor.removeBlocks([operation.id]);
          editor.insertBlocks(
            [block],
            operation.reference,
            operation.placement,
          );
          break;
        }
        case "delete":
          editor.removeBlocks([operation.id]);
          break;
      }
    }
    return [...tr.steps];
  });
}

/**
 * Updates a block. The type and props go through `updateBlock`. Inline
 * content goes through the smallest ProseMirror steps (see
 * `addInlineContentSteps`), thus text that did not change keeps its identity
 * and its comments.
 */
function updateBlock(
  editor: BlockNoteEditor<any, any, any>,
  tr: Transaction,
  id: string,
  update: LensPartialBlock,
) {
  const { content, ...fields } = update;
  if (!Array.isArray(content)) {
    editor.updateBlock(id, update);
    return;
  }
  if (fields.type !== undefined || fields.props !== undefined) {
    editor.updateBlock(id, fields);
  }

  const found = getNodeById(id, tr.doc);
  const blockContent = found?.node.firstChild;
  if (found === undefined || !blockContent?.isTextblock) {
    editor.updateBlock(id, { content });
    return;
  }
  const target = Fragment.from(
    inlineContentToNodes<any, any>(
      content,
      editor.pmSchema,
      blockContent.type.name,
    ),
  );
  // The inline content starts after the block container and block content tokens.
  addInlineContentSteps(tr, found.posBeforeNode + 2, blockContent, target);
}
