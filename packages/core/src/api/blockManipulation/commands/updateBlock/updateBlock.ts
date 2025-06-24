import {
  Fragment,
  type NodeType,
  type Node as PMNode,
  Slice,
} from "prosemirror-model";
import type { Transaction } from "prosemirror-state";

import { ReplaceStep, Transform } from "prosemirror-transform";
import type { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import type {
  BlockIdentifier,
  BlockSchema,
} from "../../../../schema/blocks/types.js";
import type { InlineContentSchema } from "../../../../schema/inlineContent/types.js";
import type { StyleSchema } from "../../../../schema/styles/types.js";
import { UnreachableCaseError } from "../../../../util/typescript.js";
import {
  type BlockInfo,
  getBlockInfoFromResolvedPos,
} from "../../../getBlockInfoFromPos.js";
import {
  blockToNode,
  inlineContentToNodes,
  tableContentToNodes,
} from "../../../nodeConversions/blockToNode.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../../nodeUtil.js";
import { getPmSchema } from "../../../pmUtil.js";

// for compatibility with tiptap. TODO: remove as we want to remove dependency on tiptap command interface
export const updateBlockCommand = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  posBeforeBlock: number,
  block: PartialBlock<BSchema, I, S>,
) => {
  return ({
    tr,
    dispatch,
  }: {
    tr: Transaction;
    dispatch?: () => void;
  }): boolean => {
    if (dispatch) {
      updateBlockTr(tr, posBeforeBlock, block);
    }
    return true;
  };
};

export function updateBlockTr<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  tr: Transform,
  posBeforeBlock: number,
  block: PartialBlock<BSchema, I, S>,
  replaceFromPos?: number,
  replaceToPos?: number,
) {
  const blockInfo = getBlockInfoFromResolvedPos(tr.doc.resolve(posBeforeBlock));

  const pmSchema = getPmSchema(tr);

  if (
    replaceFromPos !== undefined &&
    replaceToPos !== undefined &&
    replaceFromPos > replaceToPos
  ) {
    throw new Error("Invalid replaceFromPos or replaceToPos");
  }

  // Adds blockGroup node with child blocks if necessary.

  const oldNodeType = pmSchema.nodes[blockInfo.blockNoteType];
  const newNodeType = pmSchema.nodes[block.type || blockInfo.blockNoteType];
  const newBnBlockNodeType = newNodeType.isInGroup("bnBlock")
    ? newNodeType
    : pmSchema.nodes["blockContainer"];

  if (blockInfo.isBlockContainer && newNodeType.isInGroup("blockContent")) {
    const replaceFromOffset =
      replaceFromPos !== undefined &&
      replaceFromPos > blockInfo.blockContent.beforePos &&
      replaceFromPos < blockInfo.blockContent.afterPos
        ? replaceFromPos - blockInfo.blockContent.beforePos - 1
        : undefined;

    const replaceToOffset =
      replaceToPos !== undefined &&
      replaceToPos > blockInfo.blockContent.beforePos &&
      replaceToPos < blockInfo.blockContent.afterPos
        ? replaceToPos - blockInfo.blockContent.beforePos - 1
        : undefined;

    updateChildren(block, tr, blockInfo);
    // The code below determines the new content of the block.
    // or "keep" to keep as-is
    updateBlockContentNode(
      block,
      tr,
      oldNodeType,
      newNodeType,
      blockInfo,
      replaceFromOffset,
      replaceToOffset,
    );
  } else if (!blockInfo.isBlockContainer && newNodeType.isInGroup("bnBlock")) {
    updateChildren(block, tr, blockInfo);
    // old node was a bnBlock type (like column or columnList) and new block as well
    // No op, we just update the bnBlock below (at end of function) and have already updated the children
  } else {
    // switching from blockContainer to non-blockContainer or v.v.
    // currently breaking for column slash menu items converting empty block
    // to column.

    // currently, we calculate the new node and replace the entire node with the desired new node.
    // for this, we do a nodeToBlock on the existing block to get the children.
    // it would be cleaner to use a ReplaceAroundStep, but this is a bit simpler and it's quite an edge case
    const existingBlock = nodeToBlock(blockInfo.bnBlock.node, pmSchema);
    tr.replaceWith(
      blockInfo.bnBlock.beforePos,
      blockInfo.bnBlock.afterPos,
      blockToNode(
        {
          children: existingBlock.children, // if no children are passed in, use existing children
          ...block,
        },
        pmSchema,
      ),
    );

    return;
  }

  // Adds all provided props as attributes to the parent blockContainer node too, and also preserves existing
  // attributes.
  tr.setNodeMarkup(blockInfo.bnBlock.beforePos, newBnBlockNodeType, {
    ...blockInfo.bnBlock.node.attrs,
    ...block.props,
  });
}

function updateBlockContentNode<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  block: PartialBlock<BSchema, I, S>,
  tr: Transform,
  oldNodeType: NodeType,
  newNodeType: NodeType,
  blockInfo: {
    childContainer?:
      | { node: PMNode; beforePos: number; afterPos: number }
      | undefined;
    blockContent: { node: PMNode; beforePos: number; afterPos: number };
  },
  replaceFromOffset?: number,
  replaceToOffset?: number,
) {
  const pmSchema = getPmSchema(tr);
  let content: PMNode[] | "keep" = "keep";

  // Has there been any custom content provided?
  if (block.content) {
    if (typeof block.content === "string") {
      // Adds a single text node with no marks to the content.
      content = inlineContentToNodes(
        [block.content],
        pmSchema,
        newNodeType.name,
      );
    } else if (Array.isArray(block.content)) {
      // Adds a text node with the provided styles converted into marks to the content,
      // for each InlineContent object.
      content = inlineContentToNodes(block.content, pmSchema, newNodeType.name);
    } else if (block.content.type === "tableContent") {
      content = tableContentToNodes(block.content, pmSchema);
    } else {
      throw new UnreachableCaseError(block.content.type);
    }
  } else {
    // no custom content has been provided, use existing content IF possible
    // Since some block types contain inline content and others don't,
    // we either need to call setNodeMarkup to just update type &
    // attributes, or replaceWith to replace the whole blockContent.
    if (oldNodeType.spec.content === "") {
      // keep old content, because it's empty anyway and should be compatible with
      // any newContentType
    } else if (newNodeType.spec.content !== oldNodeType.spec.content) {
      // the content type changed, replace the previous content
      content = [];
    } else {
      // keep old content, because the content type is the same and should be compatible
    }
  }

  // Now, changes the blockContent node type and adds the provided props
  // as attributes. Also preserves all existing attributes that are
  // compatible with the new type.
  //
  // Use either setNodeMarkup or replaceWith depending on whether the
  // content is being replaced or not.
  if (content === "keep") {
    // use setNodeMarkup to only update the type and attributes
    tr.setNodeMarkup(blockInfo.blockContent.beforePos, newNodeType, {
      ...blockInfo.blockContent.node.attrs,
      ...block.props,
    });
  } else if (replaceFromOffset !== undefined || replaceToOffset !== undefined) {
    // first update markup of the containing node
    tr.setNodeMarkup(blockInfo.blockContent.beforePos, newNodeType, {
      ...blockInfo.blockContent.node.attrs,
      ...block.props,
    });

    const start =
      blockInfo.blockContent.beforePos + 1 + (replaceFromOffset ?? 0);
    const end =
      blockInfo.blockContent.beforePos +
      1 +
      (replaceToOffset ?? blockInfo.blockContent.node.content.size);

    // for content like table cells (where the blockcontent has nested PM nodes),
    // we need to figure out the correct openStart and openEnd for the slice when replacing

    const contentDepth = tr.doc.resolve(blockInfo.blockContent.beforePos).depth;
    const startDepth = tr.doc.resolve(start).depth;
    const endDepth = tr.doc.resolve(end).depth;

    tr.replace(
      start,
      end,
      new Slice(
        Fragment.from(content),
        startDepth - contentDepth - 1,
        endDepth - contentDepth - 1,
      ),
    );
  } else {
    // use replaceWith to replace the content and the block itself
    // also reset the selection since replacing the block content
    // sets it to the next block.
    tr.replaceWith(
      blockInfo.blockContent.beforePos,
      blockInfo.blockContent.afterPos,
      newNodeType.createChecked(
        {
          ...blockInfo.blockContent.node.attrs,
          ...block.props,
        },
        content,
      ),
    );
  }
}

function updateChildren<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(block: PartialBlock<BSchema, I, S>, tr: Transform, blockInfo: BlockInfo) {
  const pmSchema = getPmSchema(tr);
  if (block.children !== undefined && block.children.length > 0) {
    const childNodes = block.children.map((child) => {
      return blockToNode(child, pmSchema);
    });

    // Checks if a blockGroup node already exists.
    if (blockInfo.childContainer) {
      // Replaces all child nodes in the existing blockGroup with the ones created earlier.

      // use a replacestep to avoid the fitting algorithm
      tr.step(
        new ReplaceStep(
          blockInfo.childContainer.beforePos + 1,
          blockInfo.childContainer.afterPos - 1,
          new Slice(Fragment.from(childNodes), 0, 0),
        ),
      );
    } else {
      if (!blockInfo.isBlockContainer) {
        throw new Error("impossible");
      }
      // Inserts a new blockGroup containing the child nodes created earlier.
      tr.insert(
        blockInfo.blockContent.afterPos,
        pmSchema.nodes["blockGroup"].createChecked({}, childNodes),
      );
    }
  }
}

export function updateBlock<
  BSchema extends BlockSchema = any,
  I extends InlineContentSchema = any,
  S extends StyleSchema = any,
>(
  tr: Transaction,
  blockToUpdate: BlockIdentifier,
  update: PartialBlock<BSchema, I, S>,
  replaceFromPos?: number,
  replaceToPos?: number,
): Block<BSchema, I, S> {
  const id =
    typeof blockToUpdate === "string" ? blockToUpdate : blockToUpdate.id;
  const posInfo = getNodeById(id, tr.doc);
  if (!posInfo) {
    throw new Error(`Block with ID ${id} not found`);
  }

  updateBlockTr(
    tr,
    posInfo.posBeforeNode,
    update,
    replaceFromPos,
    replaceToPos,
  );

  const blockContainerNode = tr.doc
    .resolve(posInfo.posBeforeNode + 1) // TODO: clean?
    .node();

  const pmSchema = getPmSchema(tr);
  return nodeToBlock(blockContainerNode, pmSchema);
}
