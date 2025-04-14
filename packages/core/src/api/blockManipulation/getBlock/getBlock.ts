import type { Node } from "prosemirror-model";
import type { Block } from "../../../blocks/defaultBlocks.js";
import type { BlockCache } from "../../../editor/BlockNoteEditor.js";
import type { BlockNoteSchema } from "../../../editor/BlockNoteSchema.js";
import type {
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
  doc: Node,
  schema: BlockNoteSchema<BSchema, I, S>,
  blockIdentifier: BlockIdentifier,
  blockCache?: BlockCache<BSchema, I, S>
): Block<BSchema, I, S> | undefined {
  const id =
    typeof blockIdentifier === "string" ? blockIdentifier : blockIdentifier.id;

  const posInfo = getNodeById(id, doc);
  if (!posInfo) {
    return undefined;
  }

  return nodeToBlock(
    posInfo.node,
    schema.blockSchema,
    schema.inlineContentSchema,
    schema.styleSchema,
    blockCache
  );
}

export function getPrevBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  doc: Node,
  schema: BlockNoteSchema<BSchema, I, S>,
  blockIdentifier: BlockIdentifier,
  blockCache?: BlockCache<BSchema, I, S>
): Block<BSchema, I, S> | undefined {
  const id =
    typeof blockIdentifier === "string" ? blockIdentifier : blockIdentifier.id;

  const posInfo = getNodeById(id, doc);
  if (!posInfo) {
    return undefined;
  }

  const $posBeforeNode = doc.resolve(posInfo.posBeforeNode);
  const nodeToConvert = $posBeforeNode.nodeBefore;
  if (!nodeToConvert) {
    return undefined;
  }

  return nodeToBlock(
    nodeToConvert,
    schema.blockSchema,
    schema.inlineContentSchema,
    schema.styleSchema,
    blockCache
  );
}

export function getNextBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  doc: Node,
  schema: BlockNoteSchema<BSchema, I, S>,
  blockIdentifier: BlockIdentifier,
  blockCache?: BlockCache<BSchema, I, S>
): Block<BSchema, I, S> | undefined {
  const id =
    typeof blockIdentifier === "string" ? blockIdentifier : blockIdentifier.id;
  const posInfo = getNodeById(id, doc);
  if (!posInfo) {
    return undefined;
  }

  const $posAfterNode = doc.resolve(
    posInfo.posBeforeNode + posInfo.node.nodeSize
  );
  const nodeToConvert = $posAfterNode.nodeAfter;
  if (!nodeToConvert) {
    return undefined;
  }

  return nodeToBlock(
    nodeToConvert,
    schema.blockSchema,
    schema.inlineContentSchema,
    schema.styleSchema,
    blockCache
  );
}

export function getParentBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  doc: Node,
  schema: BlockNoteSchema<BSchema, I, S>,
  blockIdentifier: BlockIdentifier,
  blockCache?: BlockCache<BSchema, I, S>
): Block<BSchema, I, S> | undefined {
  const id =
    typeof blockIdentifier === "string" ? blockIdentifier : blockIdentifier.id;

  const posInfo = getNodeById(id, doc);
  if (!posInfo) {
    return undefined;
  }

  const $posBeforeNode = doc.resolve(posInfo.posBeforeNode);
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
    schema.blockSchema,
    schema.inlineContentSchema,
    schema.styleSchema,
    blockCache
  );
}
