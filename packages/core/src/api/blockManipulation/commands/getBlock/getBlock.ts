import { Node } from "prosemirror-model";

import { Block } from "../../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../../nodeUtil.js";

// Get a block from a block identifier, or return undefined if the block cannot
// be found in the editor. The ProseMirror node that gets converted into a block
// is the one that has the same ID as the block identifier. However, if the
// `getDifferentNodeForConversion` function is provided, the node returned from
// it will be converted instead, e.g. a sibling or parent. If
// `getDifferentNodeForConversion` returns undefined, this function will also
// return undefined.
function getBlockFromNode<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blockIdentifier: BlockIdentifier,
  getDifferentNodeForConversion: ({
    node,
    posBeforeNode,
  }: {
    node: Node;
    posBeforeNode: number;
  }) => Node | undefined = ({ node }) => node
): Block<BSchema, I, S> | undefined {
  const id =
    typeof blockIdentifier === "string" ? blockIdentifier : blockIdentifier.id;

  try {
    const nodeToConvert = getDifferentNodeForConversion(
      getNodeById(id, editor._tiptapEditor.state.doc)
    );
    if (!nodeToConvert) {
      return undefined;
    }

    return nodeToBlock(
      nodeToConvert,
      editor.schema.blockSchema,
      editor.schema.inlineContentSchema,
      editor.schema.styleSchema,
      editor.blockCache
    );
  } catch (e) {
    return undefined;
  }
}

export function getBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blockIdentifier: BlockIdentifier
): Block<BSchema, I, S> | undefined {
  return getBlockFromNode(editor, blockIdentifier);
}

export function getPrevBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blockIdentifier: BlockIdentifier
): Block<BSchema, I, S> | undefined {
  return getBlockFromNode(editor, blockIdentifier, ({ posBeforeNode }) => {
    const $posBeforeNode =
      editor._tiptapEditor.state.doc.resolve(posBeforeNode);

    return $posBeforeNode.nodeBefore || undefined;
  });
}

export function getNextBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blockIdentifier: BlockIdentifier
): Block<BSchema, I, S> | undefined {
  return getBlockFromNode(
    editor,
    blockIdentifier,
    ({ node, posBeforeNode }) => {
      const $posAfterNode = editor._tiptapEditor.state.doc.resolve(
        posBeforeNode + node.nodeSize
      );

      return $posAfterNode.nodeAfter || undefined;
    }
  );
}

export function getParentBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blockIdentifier: BlockIdentifier
): Block<BSchema, I, S> | undefined {
  return getBlockFromNode(editor, blockIdentifier, ({ posBeforeNode }) => {
    const $posBeforeNode =
      editor._tiptapEditor.state.doc.resolve(posBeforeNode);
    const parentNode = $posBeforeNode.node();
    const grandparentNode = $posBeforeNode.node(-1);

    return grandparentNode.type.name !== "doc"
      ? parentNode.type.name === "blockGroup"
        ? grandparentNode
        : parentNode
      : undefined;
  });
}
