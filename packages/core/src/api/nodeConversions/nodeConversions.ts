import { Mark } from "@tiptap/pm/model";
import { Node, Schema } from "prosemirror-model";
import {
  Block,
  BlockSchema,
  PartialBlock,
} from "../../extensions/Blocks/api/blockTypes";

import { defaultProps } from "../../extensions/Blocks/api/defaultBlocks";
import {
  ColorStyle,
  InlineContent,
  PartialInlineContent,
  PartialLink,
  StyledText,
  Styles,
  ToggledStyle,
} from "../../extensions/Blocks/api/inlineContentTypes";
import { getBlockInfoFromPos } from "../../extensions/Blocks/helpers/getBlockInfoFromPos";
import UniqueID from "../../extensions/UniqueID/UniqueID";
import { UnreachableCaseError } from "../../shared/utils";

const toggleStyles = new Set<ToggledStyle>([
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
]);
const colorStyles = new Set<ColorStyle>(["textColor", "backgroundColor"]);

function splitTextByNewline(text: string): string[] {
  const substrings: string[] = [];
  let currentSubstring = "";

  for (const char of text) {
    if (char === "\n") {
      substrings.push(currentSubstring);
      substrings.push("\n");
      currentSubstring = "";
    } else {
      currentSubstring += char;
    }
  }

  if (currentSubstring) {
    substrings.push(currentSubstring);
  }

  return substrings;
}

/**
 * Convert a StyledText inline element to a
 * prosemirror text node with the appropriate marks
 */
function styledTextToNodes(styledText: StyledText, schema: Schema): Node[] {
  const marks: Mark[] = [];

  for (const [style, value] of Object.entries(styledText.styles)) {
    if (toggleStyles.has(style as ToggledStyle)) {
      marks.push(schema.mark(style));
    } else if (colorStyles.has(style as ColorStyle)) {
      marks.push(schema.mark(style, { color: value }));
    }
  }

  return splitTextByNewline(styledText.text).map((text) => {
    if (text === "\n") {
      return schema.nodes["hardBreak"].create();
    } else {
      return schema.text(text, marks);
    }
  });
}

/**
 * Converts a Link inline content element to
 * prosemirror text nodes with the appropriate marks
 */
function linkToNodes(link: PartialLink, schema: Schema): Node[] {
  const linkMark = schema.marks.link.create({
    href: link.href,
  });

  return styledTextArrayToNodes(link.content, schema).map((node) => {
    return node.mark([...node.marks, linkMark]);
  });
}

/**
 * Converts an array of StyledText inline content elements to
 * prosemirror text nodes with the appropriate marks
 */
function styledTextArrayToNodes(
  content: string | StyledText[],
  schema: Schema
): Node[] {
  let nodes: Node[] = [];

  if (typeof content === "string") {
    nodes.push(schema.text(content));
    return nodes;
  }

  for (const styledText of content) {
    nodes.push(...styledTextToNodes(styledText, schema));
  }
  return nodes;
}

/**
 * converts an array of inline content elements to prosemirror nodes
 */
export function inlineContentToNodes(
  blockContent: PartialInlineContent[],
  schema: Schema
): Node[] {
  let nodes: Node[] = [];

  for (const content of blockContent) {
    if (content.type === "link") {
      nodes.push(...linkToNodes(content, schema));
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
export function blockToNode<BSchema extends BlockSchema>(
  block: PartialBlock<BSchema>,
  schema: Schema
) {
  let id = block.id;

  if (id === undefined) {
    id = UniqueID.options.generateID();
  }

  let type = block.type;

  if (type === undefined) {
    type = "paragraph";
  }

  let contentNode: Node;

  if (!block.content) {
    contentNode = schema.nodes[type].create(block.props);
  } else if (typeof block.content === "string") {
    contentNode = schema.nodes[type].create(
      block.props,
      schema.text(block.content)
    );
  } else {
    const nodes = inlineContentToNodes(block.content, schema);
    contentNode = schema.nodes[type].create(block.props, nodes);
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

/**
 * Converts an internal (prosemirror) content node to a BlockNote InlineContent array.
 */
function contentNodeToInlineContent(contentNode: Node) {
  const content: InlineContent[] = [];
  let currentContent: InlineContent | undefined = undefined;

  // Most of the logic below is for handling links because in ProseMirror links are marks
  // while in BlockNote links are a type of inline content
  contentNode.content.forEach((node) => {
    // hardBreak nodes do not have an InlineContent equivalent, instead we
    // add a newline to the previous node.
    if (node.type.name === "hardBreak") {
      // Current content exists.
      if (currentContent) {
        // Current content is text.
        if (currentContent.type === "text") {
          currentContent.text += "\n";
        }
        // Current content is a link.
        else if (currentContent.type === "link") {
          const endText = currentContent.content.pop();
          endText!.text += "\n";
          currentContent.content.push(endText!);
        }
      }
      // Current content does not exist.
      else {
        currentContent = {
          type: "text",
          text: "\n",
          styles: {},
        };
      }

      return;
    }

    const styles: Styles = {};
    let linkMark: Mark | undefined;

    for (const mark of node.marks) {
      if (mark.type.name === "link") {
        linkMark = mark;
      } else if (toggleStyles.has(mark.type.name as ToggledStyle)) {
        styles[mark.type.name as ToggledStyle] = true;
      } else if (colorStyles.has(mark.type.name as ColorStyle)) {
        styles[mark.type.name as ColorStyle] = mark.attrs.color;
      } else {
        throw Error("Mark is of an unrecognized type: " + mark.type.name);
      }
    }

    // Parsing links and text.
    // Current content exists.
    if (currentContent) {
      // Current content is text.
      if (currentContent.type === "text") {
        // Node is text (same type as current content).
        if (!linkMark) {
          // Styles are the same.
          if (
            JSON.stringify(currentContent.styles) === JSON.stringify(styles)
          ) {
            currentContent.text += node.textContent;
          }
          // Styles are different.
          else {
            content.push(currentContent);
            currentContent = {
              type: "text",
              text: node.textContent,
              styles,
            };
          }
        }
        // Node is a link (different type to current content).
        else {
          content.push(currentContent);
          currentContent = {
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
        }
      }
      // Current content is a link.
      else if (currentContent.type === "link") {
        // Node is a link (same type as current content).
        if (linkMark) {
          // Link URLs are the same.
          if (currentContent.href === linkMark.attrs.href) {
            // Styles are the same.
            if (
              JSON.stringify(
                currentContent.content[currentContent.content.length - 1].styles
              ) === JSON.stringify(styles)
            ) {
              const endText = currentContent.content.pop();
              endText!.text += node.textContent;
              currentContent.content.push(endText!);
            }
            // Styles are different.
            else {
              currentContent.content.push({
                type: "text",
                text: node.textContent,
                styles,
              });
            }
          }
          // Link URLs are different.
          else {
            content.push(currentContent);
            currentContent = {
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
          }
        }
        // Node is text (different type to current content).
        else {
          content.push(currentContent);
          currentContent = {
            type: "text",
            text: node.textContent,
            styles,
          };
        }
      }
    }
    // Current content does not exist.
    else {
      // Node is text.
      if (!linkMark) {
        currentContent = {
          type: "text",
          text: node.textContent,
          styles,
        };
      }
      // Node is a link.
      else {
        currentContent = {
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
      }
    }
  });

  if (currentContent) {
    content.push(currentContent);
  }

  return content;
}

/**
 * Convert a TipTap node to a BlockNote block.
 */
export function nodeToBlock<BSchema extends BlockSchema>(
  node: Node,
  blockSchema: BSchema,
  blockCache?: WeakMap<Node, Block<BSchema>>
): Block<BSchema> {
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
    const blockSpec = blockSchema[blockInfo.contentType.name];
    if (!blockSpec) {
      throw Error(
        "Block is of an unrecognized type: " + blockInfo.contentType.name
      );
    }

    const propSchema = blockSpec.propSchema;

    if (attr in propSchema) {
      props[attr] = value;
    }
    // Block ids are stored as node attributes the same way props are, so we
    // need to ensure we don't attempt to read block ids as props.

    // the second check is for the backgroundColor & textColor props.
    // Since we want them to be inherited by child blocks, we can't put them on the blockContent node,
    // and instead have to put them on the blockContainer node.
    // The blockContainer node is the same for all block types, but some custom blocks might not use backgroundColor & textColor,
    // so these 2 props are technically unexpected but we shouldn't log a warning.
    // (this is a bit hacky)
    else if (attr !== "id" && !(attr in defaultProps)) {
      console.warn("Block has an unrecognized attribute: " + attr);
    }
  }

  const content = contentNodeToInlineContent(blockInfo.contentNode);

  const children: Block<BSchema>[] = [];
  for (let i = 0; i < blockInfo.numChildBlocks; i++) {
    children.push(
      nodeToBlock(blockInfo.node.lastChild!.child(i), blockSchema, blockCache)
    );
  }

  const block: Block<BSchema> = {
    id,
    type: blockInfo.contentType.name,
    props,
    content,
    children,
  };

  blockCache?.set(node, block);

  return block;
}
