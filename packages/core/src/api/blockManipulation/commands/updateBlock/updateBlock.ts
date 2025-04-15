import {
  Fragment,
  NodeType,
  Node as PMNode,
  Schema,
  Slice,
} from "prosemirror-model";
import type { Transaction } from "prosemirror-state";

import { ReplaceStep } from "prosemirror-transform";
import { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import type {
  BlockCache,
  BlockNoteEditor,
} from "../../../../editor/BlockNoteEditor.js";
import type { BlockNoteSchema } from "../../../../editor/BlockNoteSchema.js";
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

export const updateBlockCommand = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  posBeforeBlock: number,
  block: PartialBlock<BSchema, I, S>,
  blockCache?: BlockCache
) => {
  return ({
    tr,
    dispatch,
  }: {
    tr: Transaction;
    dispatch?: () => void;
  }): boolean => {
    if (dispatch) {
      updateBlockTr(
        tr,
        editor.pmSchema,
        editor.schema,
        posBeforeBlock,
        block,
        blockCache
      );
    }
    return true;
  };
};

const updateBlockTr = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  tr: Transaction,
  pmSchema: Schema,
  schema: BlockNoteSchema<BSchema, I, S>,
  posBeforeBlock: number,
  block: PartialBlock<BSchema, I, S>,
  blockCache?: BlockCache
) => {
  const blockInfo = getBlockInfoFromResolvedPos(tr.doc.resolve(posBeforeBlock));

  // Adds blockGroup node with child blocks if necessary.

  const oldNodeType = pmSchema.nodes[blockInfo.blockNoteType];
  const newNodeType = pmSchema.nodes[block.type || blockInfo.blockNoteType];
  const newBnBlockNodeType = newNodeType.isInGroup("bnBlock")
    ? newNodeType
    : pmSchema.nodes["blockContainer"];

  if (blockInfo.isBlockContainer && newNodeType.isInGroup("blockContent")) {
    updateChildren(block, tr, pmSchema, schema, blockInfo);
    // The code below determines the new content of the block.
    // or "keep" to keep as-is
    updateBlockContentNode(
      block,
      tr,
      pmSchema,
      schema,
      oldNodeType,
      newNodeType,
      blockInfo
    );
  } else if (!blockInfo.isBlockContainer && newNodeType.isInGroup("bnBlock")) {
    updateChildren(block, tr, pmSchema, schema, blockInfo);
    // old node was a bnBlock type (like column or columnList) and new block as well
    // No op, we just update the bnBlock below (at end of function) and have already updated the children
  } else {
    // switching from blockContainer to non-blockContainer or v.v.
    // currently breaking for column slash menu items converting empty block
    // to column.

    // currently, we calculate the new node and replace the entire node with the desired new node.
    // for this, we do a nodeToBlock on the existing block to get the children.
    // it would be cleaner to use a ReplaceAroundStep, but this is a bit simpler and it's quite an edge case
    const existingBlock = nodeToBlock(
      blockInfo.bnBlock.node,
      schema.blockSchema,
      schema.inlineContentSchema,
      schema.styleSchema,
      blockCache
    );
    tr.replaceWith(
      blockInfo.bnBlock.beforePos,
      blockInfo.bnBlock.afterPos,
      blockToNode(
        {
          children: existingBlock.children, // if no children are passed in, use existing children
          ...block,
        },
        pmSchema,
        schema.styleSchema
      )
    );

    return;
  }

  // Adds all provided props as attributes to the parent blockContainer node too, and also preserves existing
  // attributes.
  tr.setNodeMarkup(blockInfo.bnBlock.beforePos, newBnBlockNodeType, {
    ...blockInfo.bnBlock.node.attrs,
    ...block.props,
  });
};

function updateBlockContentNode<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  block: PartialBlock<BSchema, I, S>,
  tr: Transaction,
  pmSchema: Schema,
  schema: BlockNoteSchema<BSchema, I, S>,
  oldNodeType: NodeType,
  newNodeType: NodeType,
  blockInfo: {
    childContainer?:
      | { node: PMNode; beforePos: number; afterPos: number }
      | undefined;
    blockContent: { node: PMNode; beforePos: number; afterPos: number };
  }
) {
  let content: PMNode[] | "keep" = "keep";

  // Has there been any custom content provided?
  if (block.content) {
    if (typeof block.content === "string") {
      // Adds a single text node with no marks to the content.
      content = inlineContentToNodes(
        [block.content],
        pmSchema,
        schema.styleSchema,
        newNodeType.name
      );
    } else if (Array.isArray(block.content)) {
      // Adds a text node with the provided styles converted into marks to the content,
      // for each InlineContent object.
      content = inlineContentToNodes(
        block.content,
        pmSchema,
        schema.styleSchema,
        newNodeType.name
      );
    } else if (block.content.type === "tableContent") {
      content = tableContentToNodes(
        block.content,
        pmSchema,
        schema.styleSchema
      );
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
    tr.setNodeMarkup(
      blockInfo.blockContent.beforePos,
      block.type === undefined ? undefined : pmSchema.nodes[block.type],
      {
        ...blockInfo.blockContent.node.attrs,
        ...block.props,
      }
    );
  } else {
    // use replaceWith to replace the content and the block itself
    // also  reset the selection since replacing the block content
    // sets it to the next block.
    tr.replaceWith(
      blockInfo.blockContent.beforePos,
      blockInfo.blockContent.afterPos,
      newNodeType.createChecked(
        {
          ...blockInfo.blockContent.node.attrs,
          ...block.props,
        },
        content
      )
    );
  }
}

function updateChildren<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  block: PartialBlock<BSchema, I, S>,
  tr: Transaction,
  pmSchema: Schema,
  schema: BlockNoteSchema<BSchema, I, S>,
  blockInfo: BlockInfo
) {
  if (block.children !== undefined && block.children.length > 0) {
    const childNodes = block.children.map((child) => {
      return blockToNode(child, pmSchema, schema.styleSchema);
    });

    // Checks if a blockGroup node already exists.
    if (blockInfo.childContainer) {
      // Replaces all child nodes in the existing blockGroup with the ones created earlier.

      // use a replacestep to avoid the fitting algorithm
      tr.step(
        new ReplaceStep(
          blockInfo.childContainer.beforePos + 1,
          blockInfo.childContainer.afterPos - 1,
          new Slice(Fragment.from(childNodes), 0, 0)
        )
      );
    } else {
      if (!blockInfo.isBlockContainer) {
        throw new Error("impossible");
      }
      // Inserts a new blockGroup containing the child nodes created earlier.
      tr.insert(
        blockInfo.blockContent.afterPos,
        pmSchema.nodes["blockGroup"].createChecked({}, childNodes)
      );
    }
  }
}

export function updateBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  tr: Transaction,
  pmSchema: Schema,
  schema: BlockNoteSchema<BSchema, I, S>,
  blockToUpdate: BlockIdentifier,
  update: PartialBlock<BSchema, I, S>,
  blockCache?: BlockCache
): Block<BSchema, I, S> {
  const id =
    typeof blockToUpdate === "string" ? blockToUpdate : blockToUpdate.id;
  const posInfo = getNodeById(id, tr.doc);
  if (!posInfo) {
    throw new Error(`Block with ID ${id} not found`);
  }

  updateBlockTr(
    tr,
    pmSchema,
    schema,
    posInfo.posBeforeNode,
    update,
    blockCache
  );

  const blockContainerNode = tr.doc
    .resolve(posInfo.posBeforeNode + 1) // TODO: clean?
    .node();

  return nodeToBlock(
    blockContainerNode,
    schema.blockSchema,
    schema.inlineContentSchema,
    schema.styleSchema,
    blockCache
  );
}
