import { Fragment, Node as PMNode, Slice } from "prosemirror-model";
import {
  EditorState,
  NodeSelection,
  TextSelection,
  Transaction,
} from "prosemirror-state";

import { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockIdentifier,
  BlockSchema,
} from "../../../../schema/blocks/types.js";
import { InlineContentSchema } from "../../../../schema/inlineContent/types.js";
import { StyleSchema } from "../../../../schema/styles/types.js";
import { UnreachableCaseError } from "../../../../util/typescript.js";
import { getBlockInfoFromPos } from "../../../getBlockInfoFromPos.js";
import {
  blockToNode,
  inlineContentToNodes,
  nodeToBlock,
  tableContentToNodes,
} from "../../../nodeConversions/nodeConversions.js";
import { getNodeById } from "../../../nodeUtil.js";

export const updateBlockCommandWithTr = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  posInBlock: number,
  tr: Transaction,
  block: PartialBlock<BSchema, I, S>,
  editor: BlockNoteEditor<BSchema, I, S>
) => {
  const blockInfo = getBlockInfoFromPos(tr.doc, posInBlock);
  if (blockInfo === undefined) {
    return false;
  }

  const { blockContainer, blockContent, blockGroup } = blockInfo;

  // Adds blockGroup node with child blocks if necessary.
  if (block.children !== undefined) {
    const childNodes = [];

    // Creates ProseMirror nodes for each child block, including their descendants.
    for (const child of block.children) {
      childNodes.push(
        blockToNode(child, editor.pmSchema, editor.schema.styleSchema)
      );
    }

    // Checks if a blockGroup node already exists.
    if (blockGroup) {
      // Replaces all child nodes in the existing blockGroup with the ones created earlier.
      tr.replace(
        blockGroup.beforePos + 1,
        blockGroup.afterPos - 1,
        new Slice(Fragment.from(childNodes), 0, 0)
      );
    } else {
      // Inserts a new blockGroup containing the child nodes created earlier.
      tr.insert(
        blockContent.afterPos,
        editor.pmSchema.nodes["blockGroup"].create({}, childNodes)
      );
    }
  }

  const oldType = blockContent.node.type.name;
  const newType = block.type || oldType;

  // The code below determines the new content of the block.
  // or "keep" to keep as-is
  let content: PMNode[] | "keep" = "keep";

  // Has there been any custom content provided?
  if (block.content) {
    if (typeof block.content === "string") {
      // Adds a single text node with no marks to the content.
      content = inlineContentToNodes(
        [block.content],
        editor.pmSchema,
        editor.schema.styleSchema
      );
    } else if (Array.isArray(block.content)) {
      // Adds a text node with the provided styles converted into marks to the content,
      // for each InlineContent object.
      content = inlineContentToNodes(
        block.content,
        editor.pmSchema,
        editor.schema.styleSchema
      );
    } else if (block.content.type === "tableContent") {
      content = tableContentToNodes(
        block.content,
        editor.pmSchema,
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
    const oldContentType = editor.pmSchema.nodes[oldType].spec.content;
    const newContentType = editor.pmSchema.nodes[newType].spec.content;

    if (oldContentType === "") {
      // keep old content, because it's empty anyway and should be compatible with
      // any newContentType
    } else if (newContentType !== oldContentType) {
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
      blockContent.beforePos,
      block.type === undefined ? undefined : editor.pmSchema.nodes[block.type],
      {
        ...blockContent.node.attrs,
        ...block.props,
      }
    );
  } else {
    // use replaceWith to replace the content and the block itself
    // also  reset the selection since replacing the block content
    // sets it to the next block.
    tr.replaceWith(
      blockContent.beforePos,
      blockContent.afterPos,
      editor.pmSchema.nodes[newType].create(
        {
          ...blockContent.node.attrs,
          ...block.props,
        },
        content
      )
    )
      // If the node doesn't contain editable content, we want to
      // select the whole node. But if it does have editable content,
      // we want to set the selection to the start of it.
      .setSelection(
        editor.pmSchema.nodes[newType].spec.content === ""
          ? new NodeSelection(tr.doc.resolve(blockContent.beforePos))
          : editor.pmSchema.nodes[newType].spec.content === "inline*"
          ? new TextSelection(tr.doc.resolve(blockContent.beforePos))
          : // Need to offset the position as we have to get through the
            // `tableRow` and `tableCell` nodes to get to the
            // `tableParagraph` node we want to set the selection in.
            new TextSelection(tr.doc.resolve(blockContent.beforePos + 4))
      );
  }

  // Adds all provided props as attributes to the parent blockContainer node too, and also preserves existing
  // attributes.
  tr.setNodeMarkup(blockContainer.beforePos, undefined, {
    ...blockContainer.node.attrs,
    ...block.props,
  });
  return true;
};

// TODO: this entire command should be removed as we're deprecating tiptap style transactions and commands
// Calls should be replaced with editor.updateBlock() or updateBlock below
export const updateBlockCommand =
  <
    BSchema extends BlockSchema,
    I extends InlineContentSchema,
    S extends StyleSchema
  >(
    editor: BlockNoteEditor<BSchema, I, S>,
    posInBlock: number,
    block: PartialBlock<BSchema, I, S>
  ) =>
  (args: {
    state: EditorState;
    dispatch: ((args?: any) => any) | undefined;
  }) => {
    return updateBlockCommandWithTr(posInBlock, args.state.tr, block, editor);
  };

export function updateBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blockToUpdate: BlockIdentifier,
  update: PartialBlock<BSchema, I, S>,
  existingTr?: Transaction
): Block<BSchema, I, S> {
  const ttEditor = editor._tiptapEditor;
  const tr = existingTr ?? ttEditor.state.tr;

  const id =
    typeof blockToUpdate === "string" ? blockToUpdate : blockToUpdate.id;
  const { posBeforeNode } = getNodeById(id, tr.doc);

  updateBlockCommandWithTr(posBeforeNode + 1, tr, update, editor);

  const blockContainerNode = tr.doc.resolve(posBeforeNode + 1).node();

  editor.dispatch(tr);

  return nodeToBlock(
    blockContainerNode,
    editor.schema.blockSchema,
    editor.schema.inlineContentSchema,
    editor.schema.styleSchema,
    editor.blockCache
  );
}
