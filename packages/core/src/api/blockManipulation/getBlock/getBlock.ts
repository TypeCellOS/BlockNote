import { Block } from "../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { nodeToBlock } from "../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../nodeUtil.js";

export function getBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blockIdentifier: BlockIdentifier
): Block<BSchema, I, S> | undefined {
  const id =
    typeof blockIdentifier === "string" ? blockIdentifier : blockIdentifier.id;

  const posInfo = getNodeById(id, editor._tiptapEditor.state.doc);
  if (!posInfo) {
    return undefined;
  }

  return nodeToBlock(
    posInfo.node,
    editor.schema.blockSchema,
    editor.schema.inlineContentSchema,
    editor.schema.styleSchema,
    editor.blockCache
  );
}

export function getPrevBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blockIdentifier: BlockIdentifier
): Block<BSchema, I, S> | undefined {
  const id =
    typeof blockIdentifier === "string" ? blockIdentifier : blockIdentifier.id;

  const posInfo = getNodeById(id, editor._tiptapEditor.state.doc);
  if (!posInfo) {
    return undefined;
  }

  const $posBeforeNode = editor._tiptapEditor.state.doc.resolve(
    posInfo.posBeforeNode
  );
  const nodeToConvert = $posBeforeNode.nodeBefore;
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
}

export function getNextBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blockIdentifier: BlockIdentifier
): Block<BSchema, I, S> | undefined {
  const id =
    typeof blockIdentifier === "string" ? blockIdentifier : blockIdentifier.id;

  const posInfo = getNodeById(id, editor._tiptapEditor.state.doc);
  if (!posInfo) {
    return undefined;
  }

  const $posAfterNode = editor._tiptapEditor.state.doc.resolve(
    posInfo.posBeforeNode + posInfo.node.nodeSize
  );
  const nodeToConvert = $posAfterNode.nodeAfter;
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
}

export function getParentBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blockIdentifier: BlockIdentifier
): Block<BSchema, I, S> | undefined {
  const id =
    typeof blockIdentifier === "string" ? blockIdentifier : blockIdentifier.id;

  const posInfo = getNodeById(id, editor._tiptapEditor.state.doc);
  if (!posInfo) {
    return undefined;
  }

  const $posBeforeNode = editor._tiptapEditor.state.doc.resolve(
    posInfo.posBeforeNode
  );
  const parentNode = $posBeforeNode.node();
  const grandparentNode = $posBeforeNode.node(-1);
  const nodeToConvert =
    grandparentNode.type.name !== "doc"
      ? parentNode.type.name === "blockGroup"
        ? grandparentNode
        : parentNode
      : undefined;
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
}
