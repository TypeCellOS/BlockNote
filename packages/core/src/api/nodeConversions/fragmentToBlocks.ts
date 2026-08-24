import { Fragment, Node } from "@tiptap/pm/model";
import {
  BlockNoDefaults,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import {
  getChildrenConfig,
  getContainerChildrenHolder,
  isContainerNode,
  isContentContainerNode,
  isPlaceableAnywhere,
  resolveChildren,
} from "../../schema/blocks/children.js";
import { getBlockSchema } from "../pmUtil.js";
import { nodeToBlock } from "./nodeToBlock.js";

function isSelfContainedContainer(node: Node): boolean {
  const children = getContainerChildrenHolder(node);
  if (!children) {
    return false;
  }
  // A content-bearing container whose own `__content` was sliced away (the
  // mirror case above) is a partial selection, never whole. Flatten it to the
  // selected children rather than converting the truncated container.
  if (!isContentContainerNode(node) && !isContainerNode(node.type)) {
    return false;
  }
  const blockConfig = getBlockSchema(node.type.schema)[node.type.name] ?? {};
  const childrenConfig = getChildrenConfig(blockConfig);
  if (!childrenConfig) {
    return false;
  }
  return (
    isPlaceableAnywhere(blockConfig) &&
    children.childCount >= resolveChildren(childrenConfig).min
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
    const childrenHolder = getContainerChildrenHolder(node);
    if (childrenHolder && !isSelfContainedContainer(node)) {
      const content = containerContentAsBlock<B, I, S>(node, root);
      if (content) {
        blocks.push(content);
      }
      childrenHolder.forEach((child) => pushFlattened(child, root));
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
