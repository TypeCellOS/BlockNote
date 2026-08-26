import { Fragment, Node } from "@tiptap/pm/model";
import {
  BlockNoDefaults,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import {
  isContainerNode,
  resolveChildren,
} from "../../schema/blocks/children.js";
import { getBlockSchema } from "../pmUtil.js";
import { nodeToBlock } from "./nodeToBlock.js";

function isSelfContainedContainer(node: Node): boolean {
  if (!isContainerNode(node.type)) {
    return false;
  }
  const blockConfig = getBlockSchema(node.type.schema)[node.type.name];
  const childrenConfig = blockConfig?.children;
  if (!blockConfig || !childrenConfig) {
    return false;
  }
  return (
    blockConfig.placement !== "containerOnly" &&
    node.childCount >= resolveChildren(childrenConfig).min
  );
}

export function fragmentToBlocks<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(fragment: Fragment) {
  const blocks: BlockNoDefaults<B, I, S>[] = [];

  const pushFlattened = (node: Node, root: Node) => {
    if (isContainerNode(node.type) && !isSelfContainedContainer(node)) {
      node.forEach((child) => pushFlattened(child, root));
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
