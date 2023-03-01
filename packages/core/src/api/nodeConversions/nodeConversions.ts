import { Node, Schema } from "prosemirror-model";
import { getBlockInfoFromPos } from "../../extensions/Blocks/helpers/getBlockInfoFromPos";
import {
  Block,
  BlockProps,
  blockProps,
  PartialBlock,
} from "../../extensions/Blocks/api/blockTypes";
import { Style, StyledText } from "../../extensions/Blocks/api/styleTypes";

export function blockToNode(block: PartialBlock, schema: Schema) {
  let content: Node[] = [];

  if (typeof block.content === "string") {
    content.push(schema.text(block.content));
  } else if (typeof block.content === "object") {
    for (const styledText of block.content) {
      const marks = [];

      for (const style of styledText.styles) {
        marks.push(schema.mark(style.type, style.props));
      }

      content.push(schema.text(styledText.text, marks));
    }
  }

  const contentNode = schema.nodes[block.type].create(block.props, content);

  const children: Node[] = [];

  if (block.children) {
    for (const child of block.children) {
      children.push(blockToNode(child, schema));
    }
  }

  const groupNode = schema.nodes["blockGroup"].create({}, children);

  return schema.nodes["blockContainer"].create(
    block.props,
    children.length > 0 ? [contentNode, groupNode] : contentNode
  );
}

export function getNodeById(
  id: string,
  doc: Node
): { node: Node; posBeforeNode: number } {
  let targetNode: Node | undefined = undefined;
  let posBeforeNode: number | undefined = undefined;

  doc.descendants((node, pos) => {
    // Skips traversing nodes after node with target ID has been found.
    if (targetNode) {
      return false;
    }

    // Keeps traversing nodes if block with target ID has not been found.
    if (node.type.name !== "blockContainer" || node.attrs.id !== id) {
      return true;
    }

    targetNode = node;
    posBeforeNode = pos;

    return false;
  });

  if (!targetNode || !posBeforeNode) {
    throw Error("Could not find block in the editor with matching ID.");
  }

  return {
    node: targetNode,
    posBeforeNode: posBeforeNode,
  };
}

export function nodeToBlock(
  node: Node,
  blockCache?: WeakMap<Node, Block>
): Block {
  const cachedBlock = blockCache?.get(node);

  if (cachedBlock) {
    return cachedBlock;
  }

  const blockInfo = getBlockInfoFromPos(node, 0)!;

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

    if (validAttrs.has(attr as BlockProps)) {
      props[attr] = value;
    }
  }

  const content: StyledText[] = [];
  blockInfo.contentNode.content.forEach((node) => {
    const styles: Style[] = [];

    for (const mark of node.marks) {
      styles.push({
        type: mark.type.name,
        props: mark.attrs,
      } as Style);
    }

    content.push({
      text: node.textContent,
      styles: styles,
    });
  });

  const children: Block[] = [];
  for (let i = 0; i < blockInfo.numChildBlocks; i++) {
    children.push(nodeToBlock(blockInfo.node.lastChild!.child(i)));
  }

  const block: Block = {
    id: blockInfo.id,
    type: blockInfo.contentType.name as Block["type"],
    props: props,
    content: content,
    children: children,
  };

  blockCache?.set(node, block);

  return block;
}
