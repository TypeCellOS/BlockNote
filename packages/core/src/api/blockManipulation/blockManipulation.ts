import { Editor } from "@tiptap/core";
import { Node } from "prosemirror-model";
import {
  BlockIdentifier,
  BlockSchema,
  PartialBlock,
} from "../../extensions/Blocks/api/blockTypes";
import { blockToNode } from "../nodeConversions/nodeConversions";
import { getNodeById } from "../util/nodeUtil";

export function insertBlocks<BSchema extends BlockSchema>(
  blocksToInsert: PartialBlock<BSchema>[],
  referenceBlock: BlockIdentifier,
  placement: "before" | "after" | "nested" = "before",
  editor: Editor
): void {
  const id =
    typeof referenceBlock === "string" ? referenceBlock : referenceBlock.id;

  const nodesToInsert: Node[] = [];
  for (const blockSpec of blocksToInsert) {
    nodesToInsert.push(blockToNode(blockSpec, editor.schema));
  }

  let insertionPos = -1;

  const { node, posBeforeNode } = getNodeById(id, editor.state.doc);

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

export function updateBlock<BSchema extends BlockSchema>(
  blockToUpdate: BlockIdentifier,
  update: PartialBlock<BSchema>,
  editor: Editor
) {
  const id =
    typeof blockToUpdate === "string" ? blockToUpdate : blockToUpdate.id;
  const { posBeforeNode } = getNodeById(id, editor.state.doc);

  editor.commands.BNUpdateBlock(posBeforeNode + 1, update);
}

export function removeBlocks(
  blocksToRemove: BlockIdentifier[],
  editor: Editor
) {
  const idsOfBlocksToRemove = new Set<string>(
    blocksToRemove.map((block) =>
      typeof block === "string" ? block : block.id
    )
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

export function replaceBlocks<BSchema extends BlockSchema>(
  blocksToRemove: BlockIdentifier[],
  blocksToInsert: PartialBlock<BSchema>[],
  editor: Editor
) {
  insertBlocks(blocksToInsert, blocksToRemove[0], "before", editor);
  removeBlocks(blocksToRemove, editor);
}
