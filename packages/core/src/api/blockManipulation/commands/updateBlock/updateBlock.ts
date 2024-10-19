import { Fragment, Node as PMNode, Slice } from "prosemirror-model";
import { EditorState } from "prosemirror-state";

import { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockIdentifier,
  BlockSchema,
} from "../../../../schema/blocks/types.js";
import { InlineContentSchema } from "../../../../schema/inlineContent/types.js";
import { StyleSchema } from "../../../../schema/styles/types.js";
import { UnreachableCaseError } from "../../../../util/typescript.js";
import { getBlockInfoFromResolvedPos } from "../../../getBlockInfoFromPos.js";
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
    const { blockContainer, blockContent, blockGroup } =
      getBlockInfoFromResolvedPos(state.doc.resolve(posBeforeBlock));

    if (dispatch) {
      // Adds blockGroup node with child blocks if necessary.
      if (block.children !== undefined) {
        const childNodes = [];

        // Creates ProseMirror nodes for each child block, including their descendants.
        for (const child of block.children) {
          childNodes.push(
            blockToNode(child, state.schema, editor.schema.styleSchema)
          );
        }

        // Checks if a blockGroup node already exists.
        if (blockGroup) {
          // Replaces all child nodes in the existing blockGroup with the ones created earlier.
          state.tr.replace(
            blockGroup.beforePos + 1,
            blockGroup.afterPos - 1,
            new Slice(Fragment.from(childNodes), 0, 0)
          );
        } else {
          // Inserts a new blockGroup containing the child nodes created earlier.
          state.tr.insert(
            blockContent.afterPos,
            state.schema.nodes["blockGroup"].create({}, childNodes)
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
            state.schema,
            editor.schema.styleSchema
          );
        } else if (Array.isArray(block.content)) {
          // Adds a text node with the provided styles converted into marks to the content,
          // for each InlineContent object.
          content = inlineContentToNodes(
            block.content,
            state.schema,
            editor.schema.styleSchema
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
        const oldContentType = state.schema.nodes[oldType].spec.content;
        const newContentType = state.schema.nodes[newType].spec.content;

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
        state.tr.setNodeMarkup(
          blockContent.beforePos,
          block.type === undefined ? undefined : state.schema.nodes[block.type],
          {
            ...blockContent.node.attrs,
            ...block.props,
          }
        );
      } else {
        // use replaceWith to replace the content and the block itself
        // also  reset the selection since replacing the block content
        // sets it to the next block.
        state.tr.replaceWith(
          blockContent.beforePos,
          blockContent.afterPos,
          state.schema.nodes[newType].create(
            {
              ...blockContent.node.attrs,
              ...block.props,
            },
            content
          )
        );
      }

      // Adds all provided props as attributes to the parent blockContainer node too, and also preserves existing
      // attributes.
      state.tr.setNodeMarkup(blockContainer.beforePos, undefined, {
        ...blockContainer.node.attrs,
        ...block.props,
      });
    }

    return true;
  };

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
  const { posBeforeNode } = getNodeById(id, ttEditor.state.doc);

  ttEditor.commands.command(({ state, dispatch }) => {
    updateBlockCommand(editor, posBeforeNode, update)({ state, dispatch });
    return true;
  });

  const blockContainerNode = ttEditor.state.doc
    .resolve(posBeforeNode + 1) // TODO: clean?
    .node();

  return nodeToBlock(
    blockContainerNode,
    editor.schema.blockSchema,
    editor.schema.inlineContentSchema,
    editor.schema.styleSchema,
    editor.blockCache
  );
}
