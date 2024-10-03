import { Node } from "prosemirror-model";

/**
 * Helper function for `getBlockInfoFromPos`, returns information regarding
 * provided blockContainer node.
 * @param blockContainer The blockContainer node to retrieve info for.
 */
export function getBlockInfo(blockContainer: Node) {
  const id = blockContainer.attrs["id"];

  if (blockContainer.type.name === "blockContainer") {
    const contentNode = blockContainer.firstChild!;
    const contentType = contentNode.type;
    const numChildBlocks =
      blockContainer.childCount === 2
        ? blockContainer.lastChild!.childCount
        : 0;

    return {
      hasContent: true,
      id,
      node: blockContainer,
      contentNode,
      type: contentType,
      numChildBlocks,
      childContainerNode: blockContainer.lastChild,
    } as const;
  } else {
    return {
      hasContent: false,
      node: blockContainer,
      id,
      type: blockContainer.type,
      numChildBlocks: blockContainer.childCount,
      childContainerNode: blockContainer,
      contentNode: undefined,
    } as const;
  }
}

/**
 * Retrieves information regarding the nearest blockContainer node in a
 * ProseMirror doc, relative to a position.
 * @param doc The ProseMirror doc.
 * @param pos An integer position.
 * @returns A BlockInfo object for the nearest blockContainer node.
 */
export function getBlockInfoFromPos(doc: Node, pos: number) {
  // If the position is outside the outer block group, we need to move it to the
  // nearest block. This happens when the collaboration plugin is active, where
  // the selection is placed at the very end of the doc.
  const outerBlockGroupStartPos = 1;
  const outerBlockGroupEndPos = doc.nodeSize - 2;
  if (pos <= outerBlockGroupStartPos) {
    pos = outerBlockGroupStartPos + 1;

    while (
      doc.resolve(pos).parent.type.spec.group !== "blockContainerGroup" &&
      pos < outerBlockGroupEndPos
    ) {
      pos++;
    }
  } else if (pos >= outerBlockGroupEndPos) {
    pos = outerBlockGroupEndPos - 1;

    while (
      doc.resolve(pos).parent.type.spec.group !== "blockContainerGroup" &&
      pos > outerBlockGroupStartPos
    ) {
      pos--;
    }
  }

  // This gets triggered when a node selection on a block is active, i.e. when
  // you drag and drop a block.
  if (doc.resolve(pos).parent.type.name === "blockGroup") {
    // TODO
    pos++;
  }

  const $pos = doc.resolve(pos);

  const maxDepth = $pos.depth;
  let node = $pos.node(maxDepth);
  let depth = maxDepth;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (depth < 0) {
      throw new Error(
        "Could not find blockContainer node. This can only happen if the underlying BlockNote schema has been edited."
      );
    }

    if (node.type.spec.group === "blockContainerGroup") {
      break;
    }

    depth -= 1;
    node = $pos.node(depth);
  }

  const info = getBlockInfo(node);

  const startPos = $pos.start(depth);
  const endPos = $pos.end(depth);

  return {
    ...info,
    startPos,
    endPos,
    depth,
  };
}
