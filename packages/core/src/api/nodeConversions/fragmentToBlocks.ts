import { Fragment, Node } from "@tiptap/pm/model";
import {
  BlockNoDefaults,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import {
  getChildrenConfig,
  isContainerNode,
  isContentContainerNode,
  isPlaceableAnywhere,
  resolveChildren,
} from "../../schema/blocks/children.js";
import { getBlockSchema } from "../pmUtil.js";
import { nodeToBlock } from "./nodeToBlock.js";

function getContainerChildren(
  node: Node,
): { blockType: string; children: Node } | undefined {
  if (isContentContainerNode(node)) {
    return { blockType: node.type.name, children: node.lastChild! };
  }
  if (isContainerNode(node.type)) {
    return { blockType: node.type.name, children: node };
  }
  return undefined;
}

function isSelfContainedContainer(node: Node): boolean {
  const container = getContainerChildren(node);
  if (!container) {
    return false;
  }
  const blockConfig =
    getBlockSchema(node.type.schema)[container.blockType] ?? {};
  const children = getChildrenConfig(blockConfig);
  if (!children) {
    return false;
  }
  return (
    isPlaceableAnywhere(blockConfig) &&
    container.children.childCount >= resolveChildren(children).min
  );
}

function containerContentAsBlock<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(node: Node, root: Node): BlockNoDefaults<B, I, S> | undefined {
  if (!isContentContainerNode(node) || node.firstChild!.content.size === 0) {
    return undefined;
  }
  const schema = node.type.schema;
  const paragraph = schema.nodes["paragraph"].create(
    null,
    node.firstChild!.content,
  );

  return nodeToBlock(
    schema.nodes["blockContainer"].createAndFill(null, paragraph)!,
    root,
  );
}

export function fragmentToBlocks<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(fragment: Fragment) {
  const blocks: BlockNoDefaults<B, I, S>[] = [];

  const pushFlattened = (node: Node, root: Node) => {
    const container = getContainerChildren(node);
    if (container && !isSelfContainedContainer(node)) {
      const content = containerContentAsBlock<B, I, S>(node, root);
      if (content) {
        blocks.push(content);
      }
      container.children.forEach((child) => pushFlattened(child, root));
      return;
    }
    blocks.push(nodeToBlock(node, root));
  };

  fragment.descendants((node) => {
    if (node.type.name === "blockContainer") {
      if (node.firstChild?.type.name === "blockGroup") {
        return true;
      }
    }

    if (node.type.isInGroup("bnBlock")) {
      pushFlattened(node, node);
      return false;
    }
    return true;
  });
  return blocks;
}
