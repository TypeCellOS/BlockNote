import { Node as PMNode, Schema } from "prosemirror-model";
import { BlockContentAttributes } from "../nodes/Block";

const tagToContentType: Record<string, string> = {
  P: "textContent",
  H1: "headingContent",
  H2: "headingContent",
  H3: "headingContent",
  LI: "listItemContent",
};

const tagToContentAttrs: Record<
  string,
  (node: Node) => BlockContentAttributes | void
> = {
  P: () => {
    return;
  },
  H1: () => {
    return { headingLevel: "1" };
  },
  H2: () => {
    return { headingLevel: "2" };
  },
  H3: () => {
    return { headingLevel: "3" };
  },
  LI: (node) => {
    const parent = node.parentElement;

    if (!parent) {
      return;
    }

    if (parent.tagName === "UL") {
      return { listItemType: "unordered" };
    }

    if (parent.tagName === "OL") {
      return { listItemType: "ordered" };
    }

    return;
  },
};

// Converts an HTML node into a BlockNote block (implements a ProseMirror node). Assumes the HTML node has the same
// structure as a BlockNote block, i.e. it contains 1-2 children, where the first child is a leaf node with the block's
// content, and the second (optional) child contains more blocks.
export function parseBlock(node: Node, schema: Schema) {
  // Removes empty child nodes.
  node.childNodes.forEach((childNode) => {
    if (childNode.textContent && childNode.textContent.trim().length === 0) {
      node.removeChild(childNode);
    }
  });

  // Block content, i.e. a block content node and an optional block group node.
  const content = [];

  // We assume the block content node is the first of 1-2 children.
  const blockContentNode = node.firstChild!;
  const blockContentType = tagToContentType[(node as HTMLElement).tagName];
  const blockContentAttrs =
    tagToContentAttrs[(node as HTMLElement).tagName](node);
  const blockContentText = blockContentNode.textContent!.trim();

  // Converts block content HTML node to PM node.
  const blockContent = schema.nodes[blockContentType].createAndFill(
    blockContentAttrs!,
    schema.text(blockContentText),
    undefined
  )!;
  content.push(blockContent);

  // Checks if the node has a child after the block content node. If it does, it's assumed this child is a block group
  // node.
  if (Array.from(node.childNodes).length === 2) {
    const blockGroupNode = node.lastChild!;

    // Removes empty child nodes and recursively parses each block node in the block group node.
    const nestedBlocks: PMNode[] = [];
    blockGroupNode!.childNodes.forEach((childNode) => {
      if (childNode.textContent!.trim().length > 0) {
        nestedBlocks.push(parseBlock(childNode, schema));
      }
    });

    // Converts block group HTML node to PM node.
    const blockGroup = schema.nodes["blockGroup"].createAndFill(
      undefined,
      nestedBlocks,
      undefined
    )!;
    content.push(blockGroup);
  }

  return schema.nodes["block"].createAndFill(undefined, content, undefined)!;
}
