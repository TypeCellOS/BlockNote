import { Fragment, Node } from "@tiptap/pm/model";
import {
  BlockNoDefaults,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import {
  blockTypeOfContainerChildrenNode,
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
    // The children live in the generated `__children` node, the last child.
    // When a slice boundary cuts through the container's own `__content`, that
    // node is absent and the last child is the `__content` node instead; the
    // container then has no children to flatten and is converted whole.
    const lastChild = node.lastChild;
    return lastChild && isContainerNode(lastChild.type)
      ? { blockType: node.type.name, children: lastChild }
      : undefined;
  }
  // Mirror case: a slice cut through the container's own `__content`, leaving
  // its `__children` node as the first child. The children are still there,
  // one node deeper, and the container is flattened to them.
  const firstChild = node.firstChild;
  if (
    firstChild &&
    blockTypeOfContainerChildrenNode(firstChild.type.name) === node.type.name
  ) {
    return { blockType: node.type.name, children: firstChild };
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
  // A content-bearing container whose own `__content` was sliced away (the
  // mirror case above) is a partial selection, never whole. Flatten it to the
  // selected children rather than converting the truncated container.
  if (!isContentContainerNode(node) && !isContainerNode(node.type)) {
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
      // Legacy path for `@blocknote/xl-multi-column`'s hand-written PM nodes,
      // which have no `children` config: flatten only a single-column
      // columnList (not the entire column list has been selected), and keep
      // every other column list intact, as before. Removed once multi-column
      // is migrated onto the container API.
      const blockConfig = getBlockSchema(node.type.schema)[node.type.name];
      if (isContainerNode(node.type) && !getChildrenConfig(blockConfig ?? {})) {
        if (node.type.name === "columnList" && node.childCount === 1) {
          node.firstChild?.forEach((child) => {
            blocks.push(nodeToBlock(child, node));
          });
          return false;
        }
        blocks.push(nodeToBlock(node, node));
        return false;
      }

      pushFlattened(node, node);
      return false;
    }
    return true;
  });
  return blocks;
}
