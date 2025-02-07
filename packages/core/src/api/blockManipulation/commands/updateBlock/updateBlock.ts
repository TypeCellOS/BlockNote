import { Fragment, NodeType, Node as PMNode, Slice } from "prosemirror-model";
import { EditorState } from "prosemirror-state";

import { ReplaceStep } from "prosemirror-transform";
import { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockIdentifier,
  BlockSchema,
} from "../../../../schema/blocks/types.js";
import { InlineContentSchema } from "../../../../schema/inlineContent/types.js";
import { StyleSchema } from "../../../../schema/styles/types.js";
import { UnreachableCaseError } from "../../../../util/typescript.js";
import {
  BlockInfo,
  getBlockInfoFromResolvedPos,
} from "../../../getBlockInfoFromPos.js";
import {
  blockToNode,
  inlineContentToNodes,
  tableContentToNodes,
} from "../../../nodeConversions/blockToNode.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../../nodeUtil.js";

export const updateBlockCommand =
  <
    BSchema extends BlockSchema,
    I extends InlineContentSchema,
    S extends StyleSchema
  >(
    editor: BlockNoteEditor<BSchema, I, S>,
    posBeforeBlock: number,
    block: PartialBlock<BSchema, I, S>
  ) =>
  ({
    state,
    dispatch,
  }: {
    state: EditorState;
    dispatch: ((args?: any) => any) | undefined;
  }) => {
    const blockInfo = getBlockInfoFromResolvedPos(
      state.doc.resolve(posBeforeBlock)
    );

    if (dispatch) {
      // Adds blockGroup node with child blocks if necessary.

      const oldNodeType = state.schema.nodes[blockInfo.blockNoteType];
      const newNodeType =
        state.schema.nodes[block.type || blockInfo.blockNoteType];
      const newBnBlockNodeType = newNodeType.isInGroup("bnBlock")
        ? newNodeType
        : state.schema.nodes["blockContainer"];

      if (blockInfo.isBlockContainer && newNodeType.isInGroup("blockContent")) {
        updateChildren(block, state, editor, blockInfo);
        // The code below determines the new content of the block.
        // or "keep" to keep as-is
        updateBlockContentNode(
          block,
          state,
          editor,
          oldNodeType,
          newNodeType,
          blockInfo
        );
      } else if (
        !blockInfo.isBlockContainer &&
        newNodeType.isInGroup("bnBlock")
      ) {
        updateChildren(block, state, editor, blockInfo);
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
          editor.schema.blockSchema,
          editor.schema.inlineContentSchema,
          editor.schema.styleSchema,
          editor.blockCache
        );
        state.tr.replaceWith(
          blockInfo.bnBlock.beforePos,
          blockInfo.bnBlock.afterPos,
          blockToNode(
            {
              children: existingBlock.children, // if no children are passed in, use existing children
              ...block,
            },
            state.schema,
            editor.schema.styleSchema
          )
        );

        return true;
      }

      // Adds all provided props as attributes to the parent blockContainer node too, and also preserves existing
      // attributes.
      state.tr.setNodeMarkup(blockInfo.bnBlock.beforePos, newBnBlockNodeType, {
        ...blockInfo.bnBlock.node.attrs,
        ...block.props,
      });
    }

    return true;
  };

function updateBlockContentNode<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  block: PartialBlock<BSchema, I, S>,
  state: EditorState,
  editor: BlockNoteEditor<BSchema, I, S>,
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
        state.schema,
        editor.schema.styleSchema,
        newNodeType.name
      );
    } else if (Array.isArray(block.content)) {
      // Adds a text node with the provided styles converted into marks to the content,
      // for each InlineContent object.
      content = inlineContentToNodes(
        block.content,
        state.schema,
        editor.schema.styleSchema,
        newNodeType.name
      );
    } else if (block.content.type === "tableContent") {
      content = tableContentToNodes(
        block.content,
        state.schema,
        editor.schema.styleSchema
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
    state.tr.setNodeMarkup(
      blockInfo.blockContent.beforePos,
      block.type === undefined ? undefined : state.schema.nodes[block.type],
      {
        ...blockInfo.blockContent.node.attrs,
        ...block.props,
      }
    );
  } else {
    // use replaceWith to replace the content and the block itself
    // also  reset the selection since replacing the block content
    // sets it to the next block.
    state.tr.replaceWith(
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
  state: EditorState,
  editor: BlockNoteEditor<BSchema, I, S>,
  blockInfo: BlockInfo
) {
  if (block.children !== undefined) {
    const childNodes = block.children.map((child) => {
      return blockToNode(child, state.schema, editor.schema.styleSchema);
    });

    // Checks if a blockGroup node already exists.
    if (blockInfo.childContainer) {
      // Replaces all child nodes in the existing blockGroup with the ones created earlier.

      // use a replacestep to avoid the fitting algorithm
      state.tr.step(
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
      state.tr.insert(
        blockInfo.blockContent.afterPos,
        state.schema.nodes["blockGroup"].createChecked({}, childNodes)
      );
    }
  }
}

export function updateBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blockToUpdate: BlockIdentifier,
  update: PartialBlock<BSchema, I, S>
): Block<BSchema, I, S> {
  const ttEditor = editor._tiptapEditor;

  const id =
    typeof blockToUpdate === "string" ? blockToUpdate : blockToUpdate.id;

  const posInfo = getNodeById(id, ttEditor.state.doc);
  if (!posInfo) {
    throw new Error(`Block with ID ${id} not found`);
  }

  ttEditor.commands.command(({ state, dispatch }) => {
    updateBlockCommand(
      editor,
      posInfo.posBeforeNode,
      update
    )({ state, dispatch });
    return true;
  });

  const blockContainerNode = ttEditor.state.doc
    .resolve(posInfo.posBeforeNode + 1) // TODO: clean?
    .node();

  return nodeToBlock(
    blockContainerNode,
    editor.schema.blockSchema,
    editor.schema.inlineContentSchema,
    editor.schema.styleSchema,
    editor.blockCache
  );
}
