import { TextSelection, type Transaction } from "prosemirror-state";
import { TableMap } from "prosemirror-tables";

import { Block } from "../../../blocks/defaultBlocks.js";
import { Selection } from "../../../editor/selectionTypes.js";
import {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { getBlockInfo, getNearestBlockPos } from "../../getBlockInfoFromPos.js";
import {
  nodeToBlock,
  prosemirrorSliceToSlicedBlocks,
} from "../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../nodeUtil.js";
import { getBlockNoteSchema, getPmSchema } from "../../pmUtil.js";

export function getSelection<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(tr: Transaction): Selection<BSchema, I, S> | undefined {
  const pmSchema = getPmSchema(tr);
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
  // to a block. Used to get blocks at given indices at the shared depth and
  // at the depth of `$startBlockBeforePos`.
  const indexToBlock = (
    index: number,
    depth?: number,
  ): Block<BSchema, I, S> => {
    const pos = $startBlockBeforePos.posAtIndex(index, depth);
    const node = tr.doc.resolve(pos).nodeAfter;

    if (!node) {
      throw new Error(
        `Error getting selection - node not found at position ${pos}`,
      );
    }

    return nodeToBlock(node, pmSchema);
  };

  const blocks: Block<BSchema, I, S>[] = [];
  // Minimum depth at which the blocks share a common ancestor.
  const sharedDepth = $startBlockBeforePos.sharedDepth($endBlockBeforePos.pos);
  const startIndex = $startBlockBeforePos.index(sharedDepth);
  const endIndex = $endBlockBeforePos.index(sharedDepth);

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
    blocks.push(nodeToBlock($startBlockBeforePos.nodeAfter!, pmSchema));

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
          blocks.push(indexToBlock(i, depth));
        }
      }
    }
  } else {
    // Adds the first block spanned by the selection at the shared depth.
    blocks.push(indexToBlock(startIndex, sharedDepth));
  }

  // Adds all blocks spanned by the selection at the shared depth, excluding
  // the first.
  for (let i = startIndex + 1; i <= endIndex; i++) {
    blocks.push(indexToBlock(i, sharedDepth));
  }

  if (blocks.length === 0) {
    throw new Error(
      `Error getting selection - selection doesn't span any blocks (${tr.selection})`,
    );
  }

  return {
    blocks,
  };
}

export function setSelection(
  tr: Transaction,
  startBlock: BlockIdentifier,
  endBlock: BlockIdentifier,
) {
  const startBlockId =
    typeof startBlock === "string" ? startBlock : startBlock.id;
  const endBlockId = typeof endBlock === "string" ? endBlock : endBlock.id;
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

export function getSelectionCutBlocks(tr: Transaction) {
  // TODO: fix image node selection

  const pmSchema = getPmSchema(tr);
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

  // if the start is at the start of a node (<p><span>|) move it backwards so we include all open tags (|<p><span>)
  while (start.parentOffset === 0 && start.depth > 0) {
    start = tr.doc.resolve(start.pos - 1);
  }

  // if the start is at the end of a node (|</p><p><span>|) move it forwards so we drop all closing tags (|<p><span>)
  while (start.parentOffset >= start.parent.nodeSize - 2 && start.depth > 0) {
    start = tr.doc.resolve(start.pos + 1);
  }

  const selectionInfo = prosemirrorSliceToSlicedBlocks(
    tr.doc.slice(start.pos, end.pos, true),
    pmSchema,
  );

  return {
    _meta: {
      startPos: start.pos,
      endPos: end.pos,
    },
    ...selectionInfo,
  };
}
