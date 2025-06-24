import type { Node } from "prosemirror-model";
import type { Block } from "../../../blocks/defaultBlocks.js";
import type {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { nodeToBlock } from "../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../nodeUtil.js";
import { getPmSchema } from "../../pmUtil.js";

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
  const pmSchema = getPmSchema(doc);

  const posInfo = getNodeById(id, doc);
  if (!posInfo) {
    return undefined;
  }

  return nodeToBlock(posInfo.node, pmSchema);
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
  const pmSchema = getPmSchema(doc);
  if (!posInfo) {
    return undefined;
  }

  const $posBeforeNode = doc.resolve(posInfo.posBeforeNode);
  const nodeToConvert = $posBeforeNode.nodeBefore;
  if (!nodeToConvert) {
    return undefined;
  }

  return nodeToBlock(nodeToConvert, pmSchema);
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
  const pmSchema = getPmSchema(doc);
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

  return nodeToBlock(nodeToConvert, pmSchema);
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
  const pmSchema = getPmSchema(doc);
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

  return nodeToBlock(nodeToConvert, pmSchema);
}
