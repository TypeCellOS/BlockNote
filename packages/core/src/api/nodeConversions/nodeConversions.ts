import { Mark } from "@tiptap/pm/model";
import { Node, Schema } from "prosemirror-model";
import {
  Block,
  blockProps,
  PartialBlock,
} from "../../extensions/Blocks/api/blockTypes";
import {
  InlineContent,
  Link,
  PartialInlineContent,
  Style,
  StyledText,
} from "../../extensions/Blocks/api/inlineContentTypes";
import { getBlockInfoFromPos } from "../../extensions/Blocks/helpers/getBlockInfoFromPos";
import UniqueID from "../../extensions/UniqueID/UniqueID";
import { UnreachableCaseError } from "../../shared/utils";

function styledTextArrayToNodes(
  content: string | StyledText[],
  schema: Schema,
  defaultMarks: Mark[] = []
): Node[] {
  let nodes: Node[] = [];

  if (typeof content === "string") {
    nodes.push(schema.text(content, defaultMarks));
    return nodes;
  }

  for (const styledText of content) {
    const marks = [...defaultMarks];

    for (const style of styledText.styles) {
      marks.push(schema.mark(style.type, style.props));
    }

    nodes.push(schema.text(styledText.text, marks));
  }
  return nodes;
}

export function inlineContentToNodes(
  blockContent: PartialInlineContent[],
  schema: Schema
): Node[] {
  let nodes: Node[] = [];

  for (const content of blockContent) {
    if (content.type === "link") {
      // special case for links, because in ProseMirror, links are marks
      // in BlockNote, links are a type of inline content
      const linkMark = schema.marks.link.create({
        href: content.href,
      });
      nodes.push(
        ...styledTextArrayToNodes(content.content, schema, [linkMark])
      );
    } else if (content.type === "text") {
      nodes.push(...styledTextArrayToNodes([content], schema));
    } else {
      throw new UnreachableCaseError(content);
    }
  }
  return nodes;
}

/**
 * Converts a BlockNote block to a TipTap node.
 */
export function blockToNode(block: PartialBlock, schema: Schema) {
  let id = block.id;

  if (id === undefined) {
    id = UniqueID.options.generateID();
  }

  let contentNode: Node;

  if (!block.content) {
    contentNode = schema.nodes[block.type].create(block.props);
  } else if (typeof block.content === "string") {
    contentNode = schema.nodes[block.type].create(
      block.props,
      schema.text(block.content)
    );
  } else {
    const nodes = inlineContentToNodes(block.content, schema);
    contentNode = schema.nodes[block.type].create(block.props, nodes);
  }

  const children: Node[] = [];

  if (block.children) {
    for (const child of block.children) {
      children.push(blockToNode(child, schema));
    }
  }

  const groupNode = schema.nodes["blockGroup"].create({}, children);

  return schema.nodes["blockContainer"].create(
    {
      id: id,
      ...block.props,
    },
    children.length > 0 ? [contentNode, groupNode] : contentNode
  );
}

function contentNodeToInlineContent(contentNode: Node) {
  const content: InlineContent[] = [];

  let currentLink: Link | undefined = undefined;

  // Most of the logic below is for handling links because in ProseMirror links are marks
  // while in BlockNote links are a type of inline content
  contentNode.content.forEach((node) => {
    const styles: Style[] = [];

    let linkMark: Mark | undefined;
    for (const mark of node.marks) {
      if (mark.type.name === "link") {
        linkMark = mark;
      } else {
        styles.push({
          type: mark.type.name,
          props: mark.attrs,
        } as Style);
      }
    }

    if (linkMark && currentLink && linkMark.attrs.href === currentLink.href) {
      // if the node is a link that matches the current link, add it to the current link
      currentLink.content.push({
        type: "text",
        text: node.textContent,
        styles,
      });
    } else if (linkMark) {
      // if the node is a link that doesn't match the current link, create a new link
      currentLink = {
        type: "link",
        href: linkMark.attrs.href,
        content: [
          {
            type: "text",
            text: node.textContent,
            styles,
          },
        ],
      };
      content.push(currentLink);
    } else {
      // if the node is not a link, add it to the content
      content.push({
        type: "text",
        text: node.textContent,
        styles,
      });
      currentLink = undefined;
    }
  });
  return content;
}

/**
 * Convert a TipTap node to a BlockNote block.
 */
export function nodeToBlock(
  node: Node,
  blockCache?: WeakMap<Node, Block>
): Block {
  if (node.type.name !== "blockContainer") {
    throw Error(
      "Node must be of type blockContainer, but is of type" +
        node.type.name +
        "."
    );
  }

  const cachedBlock = blockCache?.get(node);

  if (cachedBlock) {
    return cachedBlock;
  }

  const blockInfo = getBlockInfoFromPos(node, 0)!;

  let id = blockInfo.id;

  // Only used for blocks converted from other formats.
  if (id === null) {
    id = UniqueID.options.generateID();
  }

  const props: any = {};
  for (const [attr, value] of Object.entries({
    ...blockInfo.node.attrs,
    ...blockInfo.contentNode.attrs,
  })) {
    if (!(blockInfo.contentType.name in blockProps)) {
      throw Error(
        "Block is of an unrecognized type: " + blockInfo.contentType.name
      );
    }

    const validAttrs = blockProps[blockInfo.contentType.name as Block["type"]];

    if (validAttrs.has(attr)) {
      props[attr] = value;
    }
  }

  const content = contentNodeToInlineContent(blockInfo.contentNode);

  const children: Block[] = [];
  for (let i = 0; i < blockInfo.numChildBlocks; i++) {
    children.push(nodeToBlock(blockInfo.node.lastChild!.child(i)));
  }

  const block: Block = {
    id,
    type: blockInfo.contentType.name as Block["type"],
    props,
    content,
    children,
  };

  blockCache?.set(node, block);

  return block;
}
