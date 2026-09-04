import type { Node } from "prosemirror-model";
import type { Block } from "../../../blocks/defaultBlocks.js";
import type {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { getParentBlockInfo } from "../../getBlockInfoFromPos.js";
import { nodeToBlock } from "../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../nodeUtil.js";

export function getBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  doc: Node,
  blockIdentifier: BlockIdentifier,
): Block<BSchema, I, S> | undefined {
  const id =
    typeof blockIdentifier === "string" ? blockIdentifier : blockIdentifier.id;

  const posInfo = getNodeById(id, doc);
  if (!posInfo) {
    return undefined;
  }

  return nodeToBlock(posInfo.node, doc);
}

export function getPrevBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  doc: Node,
  blockIdentifier: BlockIdentifier,
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

  return nodeToBlock(nodeToConvert, doc);
}

export function getNextBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  doc: Node,
  blockIdentifier: BlockIdentifier,
): Block<BSchema, I, S> | undefined {
  const id =
    typeof blockIdentifier === "string" ? blockIdentifier : blockIdentifier.id;
  const posInfo = getNodeById(id, doc);
  if (!posInfo) {
    return undefined;
  }

  const $posAfterNode = doc.resolve(
    posInfo.posBeforeNode + posInfo.node.nodeSize,
  );
  const nodeToConvert = $posAfterNode.nodeAfter;
  if (!nodeToConvert) {
    return undefined;
  }

  return nodeToBlock(nodeToConvert, doc);
}

export function getParentBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  doc: Node,
  blockIdentifier: BlockIdentifier,
): Block<BSchema, I, S> | undefined {
  const id =
    typeof blockIdentifier === "string" ? blockIdentifier : blockIdentifier.id;
  const posInfo = getNodeById(id, doc);
  if (!posInfo) {
    return undefined;
  }

  const parentInfo = getParentBlockInfo(doc, posInfo.posBeforeNode);
  if (!parentInfo) {
    return undefined;
  }

  return nodeToBlock(parentInfo.block.node, doc);
}
