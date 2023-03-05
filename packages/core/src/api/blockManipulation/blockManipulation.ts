import { Editor } from "@tiptap/core";
import { Node } from "prosemirror-model";
import { Block, PartialBlock } from "../../extensions/Blocks/api/blockTypes";
import { blockToNode } from "../nodeConversions/nodeConversions";
import { getNodeById } from "../util/nodeUtil";

export function insertBlocks(
  blocksToInsert: PartialBlock[],
  blockToInsertAt: Block,
  placement: "before" | "after" | "nested" = "before",
  editor: Editor
): void {
  const nodesToInsert: Node[] = [];
  for (const blockSpec of blocksToInsert) {
    nodesToInsert.push(blockToNode(blockSpec, editor.schema));
  }

  let insertionPos = -1;

  const { node, posBeforeNode } = getNodeById(
    blockToInsertAt.id,
    editor.state.doc
  );

  if (placement === "before") {
    insertionPos = posBeforeNode;
  }

  if (placement === "after") {
    insertionPos = posBeforeNode + node.nodeSize;
  }

  if (placement === "nested") {
    // Case if block doesn't already have children.
    if (node.childCount < 2) {
      insertionPos = posBeforeNode + node.firstChild!.nodeSize + 1;

      const blockGroupNode = editor.state.schema.nodes["blockGroup"].create(
        {},
        nodesToInsert
      );

      editor.view.dispatch(
        editor.state.tr.insert(insertionPos, blockGroupNode)
      );

      return;
    }

    insertionPos = posBeforeNode + node.firstChild!.nodeSize + 2;
  }

  editor.view.dispatch(editor.state.tr.insert(insertionPos, nodesToInsert));
}

export function updateBlock(
  blockToUpdate: Block,
  updatedBlock: PartialBlock,
  editor: Editor
) {
  const { posBeforeNode } = getNodeById(blockToUpdate.id, editor.state.doc);

  editor.commands.BNUpdateBlock(posBeforeNode + 1, updatedBlock);
}

export function removeBlocks(blocksToRemove: Block[], editor: Editor) {
  const idsOfBlocksToRemove = new Set<string>(
    blocksToRemove.map((block) => block.id)
  );

  let removedSize = 0;

  editor.state.doc.descendants((node, pos) => {
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

    idsOfBlocksToRemove.delete(node.attrs.id);
    const oldDocSize = editor.state.doc.nodeSize;

    editor.commands.BNDeleteBlock(pos - removedSize + 1);

    const newDocSize = editor.state.doc.nodeSize;
    removedSize += oldDocSize - newDocSize;

    return false;
  });

  if (idsOfBlocksToRemove.size > 0) {
    let notFoundIds = [...idsOfBlocksToRemove].join("\n");

    throw Error(
      "Blocks with the following IDs could not be found in the editor: " +
        notFoundIds
    );
  }
}

export function replaceBlocks(
  blocksToRemove: Block[],
  blocksToInsert: PartialBlock[],
  editor: Editor
) {
  insertBlocks(blocksToInsert, blocksToRemove[0], "before", editor);
  removeBlocks(blocksToRemove, editor);
}
