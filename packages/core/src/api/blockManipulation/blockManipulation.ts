import { Node } from "prosemirror-model";

import { selectionToInsertionEnd } from "@tiptap/core";
import { Transaction } from "prosemirror-state";
import { Block, PartialBlock } from "../../blocks/defaultBlocks";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema";
import { blockToNode, nodeToBlock } from "../nodeConversions/nodeConversions";
import { getNodeById } from "../nodeUtil";

export function insertBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  blocksToInsert: PartialBlock<BSchema, I, S>[],
  referenceBlock: BlockIdentifier,
  placement: "before" | "after" | "nested" = "before",
  editor: BlockNoteEditor<BSchema, I, S>
): Block<BSchema, I, S>[] {
  const id =
    typeof referenceBlock === "string" ? referenceBlock : referenceBlock.id;

  const nodesToInsert: Node[] = [];
  for (const blockSpec of blocksToInsert) {
    nodesToInsert.push(
      blockToNode(blockSpec, editor.pmSchema, editor.schema.styleSchema)
    );
  }

  const { node, posBeforeNode } = getNodeById(
    id,
    editor._tiptapEditor.state.doc
  );

  if (placement === "before") {
    editor.dispatch(
      editor._tiptapEditor.state.tr.insert(posBeforeNode, nodesToInsert)
    );
  }

  if (placement === "after") {
    editor.dispatch(
      editor._tiptapEditor.state.tr.insert(
        posBeforeNode + node.nodeSize,
        nodesToInsert
      )
    );
  }

  if (placement === "nested") {
    // Case if block doesn't already have children.
    if (node.childCount < 2) {
      const blockGroupNode = editor._tiptapEditor.state.schema.nodes[
        "blockGroup"
      ].create({}, nodesToInsert);

      editor.dispatch(
        editor._tiptapEditor.state.tr.insert(
          posBeforeNode + node.firstChild!.nodeSize + 1,
          blockGroupNode
        )
      );
    }
  }

  // Now that the `PartialBlock`s have been converted to nodes, we can
  // re-convert them into full `Block`s.
  const insertedBlocks: Block<BSchema, I, S>[] = [];
  for (const node of nodesToInsert) {
    insertedBlocks.push(
      nodeToBlock(
        node,
        editor.schema.blockSchema,
        editor.schema.inlineContentSchema,
        editor.schema.styleSchema,
        editor.blockCache
      )
    );
  }

  return insertedBlocks;
}

export function updateBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  blockToUpdate: BlockIdentifier,
  update: PartialBlock<BSchema, I, S>,
  editor: BlockNoteEditor<BSchema, I, S>
): Block<BSchema, I, S> {
  const ttEditor = editor._tiptapEditor;

  const id =
    typeof blockToUpdate === "string" ? blockToUpdate : blockToUpdate.id;
  const { posBeforeNode } = getNodeById(id, ttEditor.state.doc);

  ttEditor.commands.BNUpdateBlock(posBeforeNode + 1, update);

  const blockContainerNode = ttEditor.state.doc
    .resolve(posBeforeNode + 1)
    .node();

  return nodeToBlock(
    blockContainerNode,
    editor.schema.blockSchema,
    editor.schema.inlineContentSchema,
    editor.schema.styleSchema,
    editor.blockCache
  );
}

function removeBlocksWithCallback<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  blocksToRemove: BlockIdentifier[],
  editor: BlockNoteEditor<BSchema, I, S>,
  // Should return new removedSize.
  callback?: (
    node: Node,
    pos: number,
    tr: Transaction,
    removedSize: number
  ) => number
): Block<BSchema, I, S>[] {
  const ttEditor = editor._tiptapEditor;
  const tr = ttEditor.state.tr;

  const idsOfBlocksToRemove = new Set<string>(
    blocksToRemove.map((block) =>
      typeof block === "string" ? block : block.id
    )
  );
  const removedBlocks: Block<BSchema, I, S>[] = [];
  let removedSize = 0;

  ttEditor.state.doc.descendants((node, pos) => {
    // Skips traversing nodes after all target blocks have been removed.
    if (idsOfBlocksToRemove.size === 0) {
      return false;
    }

    // Keeps traversing nodes if block with target ID has not been found.
    if (
      node.type.name !== "blockContainer" ||
      !idsOfBlocksToRemove.has(node.attrs.id)
    ) {
      return true;
    }

    // Saves the block that is being deleted.
    removedBlocks.push(
      nodeToBlock(
        node,
        editor.schema.blockSchema,
        editor.schema.inlineContentSchema,
        editor.schema.styleSchema,
        editor.blockCache
      )
    );
    idsOfBlocksToRemove.delete(node.attrs.id);

    // Removes the block and calculates the change in document size.
    removedSize = callback?.(node, pos, tr, removedSize) || removedSize;
    const oldDocSize = tr.doc.nodeSize;
    tr.delete(pos - removedSize - 1, pos - removedSize + node.nodeSize + 1);
    const newDocSize = tr.doc.nodeSize;
    removedSize += oldDocSize - newDocSize;

    return false;
  });

  // Throws an error if now all blocks could be found.
  if (idsOfBlocksToRemove.size > 0) {
    const notFoundIds = [...idsOfBlocksToRemove].join("\n");

    throw Error(
      "Blocks with the following IDs could not be found in the editor: " +
        notFoundIds
    );
  }

  editor.dispatch(tr);

  return removedBlocks;
}

export function removeBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  blocksToRemove: BlockIdentifier[],
  editor: BlockNoteEditor<BSchema, I, S>
): Block<BSchema, I, S>[] {
  return removeBlocksWithCallback(blocksToRemove, editor);
}

export function replaceBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  blocksToRemove: BlockIdentifier[],
  blocksToInsert: PartialBlock<BSchema, I, S>[],
  editor: BlockNoteEditor<BSchema, I, S>
): {
  insertedBlocks: Block<BSchema, I, S>[];
  removedBlocks: Block<BSchema, I, S>[];
} {
  const nodesToInsert: Node[] = [];
  for (const block of blocksToInsert) {
    nodesToInsert.push(
      blockToNode(block, editor.pmSchema, editor.schema.styleSchema)
    );
  }

  const idOfFirstBlock =
    typeof blocksToRemove[0] === "string"
      ? blocksToRemove[0]
      : blocksToRemove[0].id;
  const removedBlocks = removeBlocksWithCallback(
    blocksToRemove,
    editor,
    (node, pos, tr, removedSize) => {
      if (node.attrs.id === idOfFirstBlock) {
        const oldDocSize = tr.doc.nodeSize;
        tr.insert(pos, nodesToInsert);
        const newDocSize = tr.doc.nodeSize;

        return removedSize + oldDocSize - newDocSize;
      }

      return removedSize;
    }
  );

  // Now that the `PartialBlock`s have been converted to nodes, we can
  // re-convert them into full `Block`s.
  const insertedBlocks: Block<BSchema, I, S>[] = [];
  for (const node of nodesToInsert) {
    insertedBlocks.push(
      nodeToBlock(
        node,
        editor.schema.blockSchema,
        editor.schema.inlineContentSchema,
        editor.schema.styleSchema,
        editor.blockCache
      )
    );
  }

  return { insertedBlocks, removedBlocks };
}

// similar to tiptap insertContentAt
export function insertContentAt<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  position: any,
  nodes: Node[],
  editor: BlockNoteEditor<BSchema, I, S>,
  options: {
    updateSelection: boolean;
  } = { updateSelection: true }
) {
  const tr = editor._tiptapEditor.state.tr;

  // don’t dispatch an empty fragment because this can lead to strange errors
  // if (content.toString() === "<>") {
  //   return true;
  // }

  let { from, to } =
    typeof position === "number"
      ? { from: position, to: position }
      : { from: position.from, to: position.to };

  let isOnlyTextContent = true;
  let isOnlyBlockContent = true;
  // const nodes = isFragment(content) ? content : [content];

  let text = "";

  nodes.forEach((node) => {
    // check if added node is valid
    node.check();

    if (isOnlyTextContent && node.isText && node.marks.length === 0) {
      text += node.text;
    } else {
      isOnlyTextContent = false;
    }

    isOnlyBlockContent = isOnlyBlockContent ? node.isBlock : false;
  });

  // check if we can replace the wrapping node by
  // the newly inserted content
  // example:
  // replace an empty paragraph by an inserted image
  // instead of inserting the image below the paragraph
  if (from === to && isOnlyBlockContent) {
    const { parent } = tr.doc.resolve(from);
    const isEmptyTextBlock =
      parent.isTextblock && !parent.type.spec.code && !parent.childCount;

    if (isEmptyTextBlock) {
      from -= 1;
      to += 1;
    }
  }

  // if there is only plain text we have to use `insertText`
  // because this will keep the current marks
  if (isOnlyTextContent) {
    // if value is string, we can use it directly
    // otherwise if it is an array, we have to join it
    // if (Array.isArray(value)) {
    //   tr.insertText(value.map((v) => v.text || "").join(""), from, to);
    // } else if (typeof value === "object" && !!value && !!value.text) {
    //   tr.insertText(value.text, from, to);
    // } else {
    //   tr.insertText(value as string, from, to);
    // }
    tr.insertText(text, from, to);
  } else {
    tr.replaceWith(from, to, nodes);
  }

  // set cursor at end of inserted content
  if (options.updateSelection) {
    selectionToInsertionEnd(tr, tr.steps.length - 1, -1);
  }

  editor.dispatch(tr);

  return true;
}
