import { Fragment, Node } from "@tiptap/pm/model";
import {
  BlockNoDefaults,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import {
  isLayoutNode,
  isNamedOnly,
  minChildren,
} from "../../schema/blocks/children.js";
import { nodeToBlock } from "./nodeToBlock.js";

export function fragmentToBlocks<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(fragment: Fragment) {
  const blocks: BlockNoDefaults<B, I, S>[] = [];

  function visit(node: Node, root: Node) {
    const childrenConfig = node.type.spec.blockConfig?.children;
    const incompleteBlock =
      node.type.name === "blockContainer" &&
      node.firstChild?.type.name === "blockGroup";
    const flattenLayoutBlock =
      isLayoutNode(node.type) &&
      (!childrenConfig ||
        isNamedOnly(node.type) ||
        node.childCount < minChildren(childrenConfig));

    // Open selections and layout blocks that cannot stand alone contribute
    // their children. Complete blocks already include their descendants.
    if (
      incompleteBlock ||
      flattenLayoutBlock ||
      !node.type.isInGroup("bnBlock")
    ) {
      node.forEach((child) => visit(child, flattenLayoutBlock ? root : child));
    } else {
      blocks.push(nodeToBlock(node, root));
    }
  }

  fragment.forEach((node) => visit(node, node));
  return blocks;
}
