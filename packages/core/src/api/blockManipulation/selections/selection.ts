import { Node } from "prosemirror-model";
import { TextSelection, type Transaction } from "prosemirror-state";
import { TableMap } from "prosemirror-tables";

import { Block } from "../../../blocks/defaultBlocks.js";
import { Selection } from "../../../editor/selectionTypes.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { getBlockInfo, getNearestBlockPos } from "../../getBlockInfoFromPos.js";
import { nodeToBlock } from "../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../nodeUtil.js";
import { getBlockNoteSchema, getPmSchema } from "../../pmUtil.js";
import { resolvePMToLocation } from "../../../locations/location.js";
import { getBlockId, normalizeToRange } from "../../../locations/utils.js";
import { Location } from "../../../locations/types.js";

export function getSelection<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(tr: Transaction): Selection<BSchema, I, S> | undefined {
  // Return undefined if the selection is collapsed or a node is selected.
  if (tr.selection.empty || "node" in tr.selection) {
    return undefined;
  }

  const $startBlockBeforePos = tr.doc.resolve(
    getNearestBlockPos(tr.doc, tr.selection.from).posBeforeNode,
  );
  const $endBlockBeforePos = tr.doc.resolve(
    getNearestBlockPos(tr.doc, tr.selection.to).posBeforeNode,
  );

  // Converts the node at the given index and depth around `$startBlockBeforePos`
  // to a `blockContainer` node. Used to get blocks at given indices at the
  // shared depth and at the depth of `$startBlockBeforePos`.
  const indexToNode = (index: number, depth?: number): Node => {
    const pos = $startBlockBeforePos.posAtIndex(index, depth);
    const node = tr.doc.resolve(pos).nodeAfter;

    if (!node) {
      throw new Error(
        `Error getting selection - node not found at position ${pos}`,
      );
    }

    return node;
  };

  const blocks: Block<BSchema, I, S>[] = [];

  // Minimum depth at which the blocks share a common ancestor.
  const sharedDepth = $startBlockBeforePos.sharedDepth($endBlockBeforePos.pos);
  const startIndex = $startBlockBeforePos.index(sharedDepth);
  const endIndex = $endBlockBeforePos.index(sharedDepth);
  const withinSingleBlock = startIndex === endIndex;

  let startNode: Node | undefined = undefined;

  // In most cases, we want to return the blocks spanned by the selection at the
  // shared depth. However, when the block in which the selection starts is at a
  // higher depth than the shared depth, we omit the first block at the shared
  // depth. Instead, we include the first block at its depth, and any blocks at
  // a higher index up to the shared depth. The following  example illustrates
  // this:
  // - id-0
  //   - id-1
  //     - >|id-2
  //     - id-3
  //   - id-4
  //     - id-5
  //   - id-6
  // - id-7
  // - id-8
  // - id-9|<
  //   - id-10
  // Here, each block is represented by its ID, and the selection is represented
  // by the `>|` and `|<` markers. So the selection starts in block `id-2` and
  // ends in block `id-8`. In this case, the shared depth is 0, since the blocks
  // `id-6`, `id-7`, and `id-8` set the shared depth, as they are the least
  // nested blocks spanned by the selection. Therefore, these blocks are all
  // added to the `blocks` array. However, the selection starts in block `id-2`,
  // which is at a higher depth than the shared depth. So we add block `id-2` to
  // the `blocks` array, as well as any later siblings (in this case, `id-3`),
  // and move up one level of depth. The ancestor of block `id-2` at this depth
  // is block `id-1`, so we add all its later siblings to the `blocks` array as
  // well, again moving up one level of depth. Since we're now at the shared
  // depth, we are done. The final `blocks` array for this example would be:
  // [ id-2, id-3, id-4, id-6, id-7, id-8, id-9 ]
  if ($startBlockBeforePos.depth > sharedDepth) {
    // Adds the block that the selection starts in.
    startNode = $startBlockBeforePos.nodeAfter!;
    blocks.push(nodeToBlock(startNode));

    // Traverses all depths from the depth of the block in which the selection
    // starts, up to the shared depth.
    for (let depth = $startBlockBeforePos.depth; depth > sharedDepth; depth--) {
      const parentNode = $startBlockBeforePos.node(depth);

      if (parentNode.type.isInGroup("childContainer")) {
        const startIndexAtDepth = $startBlockBeforePos.index(depth) + 1;
        const childCountAtDepth = $startBlockBeforePos.node(depth).childCount;

        // Adds all blocks after the index of the block in which the selection
        // starts (or its ancestors at lower depths).
        for (let i = startIndexAtDepth; i < childCountAtDepth; i++) {
          blocks.push(nodeToBlock(indexToNode(i, depth)));
        }
      }
    }
  } else {
    // Adds the first block spanned by the selection at the shared depth.
    startNode = indexToNode(startIndex, sharedDepth);
    blocks.push(nodeToBlock(startNode));
  }

  // Adds all blocks spanned by the selection at the shared depth, excluding
  // the first.
  for (let i = startIndex + 1; i <= endIndex; i++) {
    blocks.push(nodeToBlock(indexToNode(i, sharedDepth)));
  }

  if (blocks.length === 0) {
    throw new Error(
      `Error getting selection - selection doesn't span any blocks (${tr.selection})`,
    );
  }

  const location = resolvePMToLocation(tr.doc, {
    anchor: tr.selection.anchor,
    head: tr.selection.head,
  });

  return {
    meta: {
      location,
      anchor: tr.selection.anchor,
      head: tr.selection.head,
      from: tr.selection.from,
      to: tr.selection.to,
    },
    range: normalizeToRange(location),
    blocks,
    /**
     * The content of the selection, but in a way that it is always a valid slice of blocks.
     */
    get content() {
      /**
       * This implements the logic to "cut" a block from the start & end of the selection (no matter where it is)
       * And return that content as a slice of blocks. The start & end are the only ones that would be different from the blocks array.
       */
      const endNode = withinSingleBlock
        ? startNode
        : indexToNode(endIndex, sharedDepth);

      let cutStartNode: Node | undefined;
      let cutEndNode: Node | undefined;

      // Find the start and end nodes within the selection content
      getSelectionContent(tr).content.descendants((node) => {
        // Search for the start node by type and id
        if (
          !cutStartNode &&
          node.type.name === startNode.type.name &&
          node.attrs.id === startNode.attrs.id
        ) {
          cutStartNode = node;
        }
        // Search for the end node by type and id
        if (
          !cutEndNode &&
          node.type.name === endNode.type.name &&
          node.attrs.id === endNode.attrs.id
        ) {
          cutEndNode = node;
        }
        return !cutStartNode || !cutEndNode;
      });

      // If we didn't find the start or end node, return no blocks
      if (!cutStartNode || !cutEndNode) {
        return [];
      }

      // If selection is within a single node, just return that node
      if (cutStartNode === cutEndNode) {
        return [nodeToBlock(cutStartNode)];
      }

      // Return start node, middle nodes, and end node
      return [
        nodeToBlock(cutStartNode),
        ...blocks.slice(1, -1),
        nodeToBlock(cutEndNode),
      ];
    },
  };
}

export function setSelection(
  tr: Transaction,
  startBlock: Location,
  endBlock: Location,
) {
  const startBlockId = getBlockId(startBlock, "start");
  const endBlockId = getBlockId(endBlock, "end");
  const pmSchema = getPmSchema(tr);
  const schema = getBlockNoteSchema(pmSchema);

  if (startBlockId === endBlockId) {
    throw new Error(
      `Attempting to set selection with the same anchor and head blocks (id ${startBlockId})`,
    );
  }
  const anchorPosInfo = getNodeById(startBlockId, tr.doc);
  if (!anchorPosInfo) {
    throw new Error(`Block with ID ${startBlockId} not found`);
  }
  const headPosInfo = getNodeById(endBlockId, tr.doc);
  if (!headPosInfo) {
    throw new Error(`Block with ID ${endBlockId} not found`);
  }

  const anchorBlockInfo = getBlockInfo(anchorPosInfo);
  const headBlockInfo = getBlockInfo(headPosInfo);

  const anchorBlockConfig =
    schema.blockSchema[
      anchorBlockInfo.blockNoteType as keyof typeof schema.blockSchema
    ];
  const headBlockConfig =
    schema.blockSchema[
      headBlockInfo.blockNoteType as keyof typeof schema.blockSchema
    ];

  if (
    !anchorBlockInfo.isBlockContainer ||
    anchorBlockConfig.content === "none"
  ) {
    throw new Error(
      `Attempting to set selection anchor in block without content (id ${startBlockId})`,
    );
  }
  if (!headBlockInfo.isBlockContainer || headBlockConfig.content === "none") {
    throw new Error(
      `Attempting to set selection anchor in block without content (id ${endBlockId})`,
    );
  }

  let startPos: number;
  let endPos: number;

  if (anchorBlockConfig.content === "table") {
    const tableMap = TableMap.get(anchorBlockInfo.blockContent.node);
    const firstCellPos =
      anchorBlockInfo.blockContent.beforePos +
      tableMap.positionAt(0, 0, anchorBlockInfo.blockContent.node) +
      1;
    startPos = firstCellPos + 2;
  } else {
    startPos = anchorBlockInfo.blockContent.beforePos + 1;
  }

  if (headBlockConfig.content === "table") {
    const tableMap = TableMap.get(headBlockInfo.blockContent.node);
    const lastCellPos =
      headBlockInfo.blockContent.beforePos +
      tableMap.positionAt(
        tableMap.height - 1,
        tableMap.width - 1,
        headBlockInfo.blockContent.node,
      ) +
      1;
    const lastCellNodeSize = tr.doc.resolve(lastCellPos).nodeAfter!.nodeSize;
    endPos = lastCellPos + lastCellNodeSize - 2;
  } else {
    endPos = headBlockInfo.blockContent.afterPos - 1;
  }

  // TODO: We should polish up the `MultipleNodeSelection` and use that instead.
  //  Right now it's missing a few things like a jsonID and styling to show
  //  which nodes are selected. `TextSelection` is ok for now, but has the
  //  restriction that the start/end blocks must have content.
  tr.setSelection(TextSelection.create(tr.doc, startPos, endPos));
}

/**
 * Gets the content of the selection, in a way that it is always a valid slice of blocks.
 * @note It may need to nudge the start or end of the selection to make it a valid slice of blocks.
 */
function getSelectionContent(tr: Transaction) {
  let start = tr.selection.$from;
  let end = tr.selection.$to;

  // the selection moves below are used to make sure `prosemirrorSliceToSlicedBlocks` returns
  // the correct information about whether content is cut at the start or end of a block

  // if the end is at the end of a node (|</span></p>) move it forward so we include all closing tags (</span></p>|)
  while (end.parentOffset >= end.parent.nodeSize - 2 && end.depth > 0) {
    end = tr.doc.resolve(end.pos + 1);
  }

  // if the end is at the start of an empty node (</span></p><p>|) move it backwards so we drop empty start tags (</span></p>|)
  while (end.parentOffset === 0 && end.depth > 0) {
    end = tr.doc.resolve(end.pos - 1);
  }

  // if we end up at a blockContainer, move it forward so we can include the blockContainer
  if (end.node().type.name === "blockContainer") {
    end = tr.doc.resolve(end.pos + 1);
  }

  // if the start is at the start of a node (<p><span>|) move it backwards so we include all open tags (|<p><span>)
  while (start.parentOffset === 0 && start.depth > 0) {
    start = tr.doc.resolve(start.pos - 1);
  }

  // if the start is at the end of a node (|</p><p><span>|) move it forwards so we drop all closing tags (|<p><span>)
  while (start.parentOffset >= start.parent.nodeSize - 2 && start.depth > 0) {
    start = tr.doc.resolve(start.pos + 1);
  }

  // if we end up at a blockContainer, move it backwards so we can exclude the blockContainer
  if (start.node().type.name === "blockContainer") {
    start = tr.doc.resolve(start.pos - 1);
  }

  return tr.doc.slice(start.pos, end.pos, true);
}
