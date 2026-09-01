import { Fragment, Node } from "@tiptap/pm/model";
import {
  BlockNoDefaults,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import {
  isContainerNode,
  isContainerOnly,
  resolveChildren,
} from "../../schema/blocks/children.js";
import { nodeToBlock } from "./nodeToBlock.js";

export function fragmentToBlocks<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(fragment: Fragment) {
  const blocks: BlockNoDefaults<B, I, S>[] = [];

  const pushFlattened = (node: Node, root: Node) => {
    if (isContainerNode(node.type)) {
      const childrenConfig = node.type.spec.blockConfig?.children;

      // A container survives as a block of its own only if it can stand
      // outside its own container (a `column` can't) and still holds enough
      // children to be valid. Anything else is flattened into its children,
      // which are the blocks the caller actually wants.
      const isSelfContained =
        !!childrenConfig &&
        !isContainerOnly(node.type) &&
        node.childCount >= resolveChildren(childrenConfig).min;

      if (!isSelfContained) {
        node.forEach((child) => pushFlattened(child, root));
        return;
      }
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
