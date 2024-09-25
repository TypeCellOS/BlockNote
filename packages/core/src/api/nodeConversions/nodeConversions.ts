import { Mark, Node, Schema, Slice } from "@tiptap/pm/model";

import UniqueID from "../../extensions/UniqueID/UniqueID";
import type {
  BlockSchema,
  CustomInlineContentConfig,
  CustomInlineContentFromConfig,
  InlineContent,
  InlineContentFromConfig,
  InlineContentSchema,
  PartialCustomInlineContentFromConfig,
  PartialInlineContent,
  PartialLink,
  PartialTableContent,
  StyleSchema,
  StyledText,
  Styles,
  TableContent,
} from "../../schema";
import { getBlockInfo } from "../getBlockInfoFromPos";

import type { Block, PartialBlock } from "../../blocks/defaultBlocks";
import {
  isLinkInlineContent,
  isPartialLinkInlineContent,
  isStyledTextInlineContent,
} from "../../schema/inlineContent/types";
import { UnreachableCaseError } from "../../util/typescript";

/**
 * Convert a StyledText inline element to a
 * prosemirror text node with the appropriate marks
 */
function styledTextToNodes<T extends StyleSchema>(
  styledText: StyledText<T>,
  schema: Schema,
  styleSchema: T
): Node[] {
  const marks: Mark[] = [];

  for (const [style, value] of Object.entries(styledText.styles || {})) {
    const config = styleSchema[style];
    if (!config) {
      throw new Error(`style ${style} not found in styleSchema`);
    }

    if (config.propSchema === "boolean") {
      marks.push(schema.mark(style));
    } else if (config.propSchema === "string") {
      marks.push(schema.mark(style, { stringValue: value }));
    } else {
      throw new UnreachableCaseError(config.propSchema);
    }
  }

  return (
    styledText.text
      // Splits text & line breaks.
      .split(/(\n)/g)
      // If the content ends with a line break, an empty string is added to the
      // end, which this removes.
      .filter((text) => text.length > 0)
      // Converts text & line breaks to nodes.
      .map((text) => {
        if (text === "\n") {
          return schema.nodes["hardBreak"].create();
        } else {
          return schema.text(text, marks);
        }
      })
  );
}

/**
 * Converts a Link inline content element to
 * prosemirror text nodes with the appropriate marks
 */
function linkToNodes(
  link: PartialLink<StyleSchema>,
  schema: Schema,
  styleSchema: StyleSchema
): Node[] {
  const linkMark = schema.marks.link.create({
    href: link.href,
  });

  return styledTextArrayToNodes(link.content, schema, styleSchema).map(
    (node) => {
      if (node.type.name === "text") {
        return node.mark([...node.marks, linkMark]);
      }

      if (node.type.name === "hardBreak") {
        return node;
      }
      throw new Error("unexpected node type");
    }
  );
}

/**
 * Converts an array of StyledText inline content elements to
 * prosemirror text nodes with the appropriate marks
 */
function styledTextArrayToNodes<S extends StyleSchema>(
  content: string | StyledText<S>[],
  schema: Schema,
  styleSchema: S
): Node[] {
  const nodes: Node[] = [];

  if (typeof content === "string") {
    nodes.push(
      ...styledTextToNodes(
        { type: "text", text: content, styles: {} },
        schema,
        styleSchema
      )
    );
    return nodes;
  }

  for (const styledText of content) {
    nodes.push(...styledTextToNodes(styledText, schema, styleSchema));
  }
  return nodes;
}

/**
 * converts an array of inline content elements to prosemirror nodes
 */
export function inlineContentToNodes<
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  blockContent: PartialInlineContent<I, S>,
  schema: Schema,
  styleSchema: S
): Node[] {
  const nodes: Node[] = [];

  for (const content of blockContent) {
    if (typeof content === "string") {
      nodes.push(...styledTextArrayToNodes(content, schema, styleSchema));
    } else if (isPartialLinkInlineContent(content)) {
      nodes.push(...linkToNodes(content, schema, styleSchema));
    } else if (isStyledTextInlineContent(content)) {
      nodes.push(...styledTextArrayToNodes([content], schema, styleSchema));
    } else {
      nodes.push(
        blockOrInlineContentToContentNode(content, schema, styleSchema)
      );
    }
  }
  return nodes;
}

/**
 * converts an array of inline content elements to prosemirror nodes
 */
export function tableContentToNodes<
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  tableContent: PartialTableContent<I, S>,
  schema: Schema,
  styleSchema: StyleSchema
): Node[] {
  const rowNodes: Node[] = [];

  for (const row of tableContent.rows) {
    const columnNodes: Node[] = [];
    for (const cell of row.cells) {
      let pNode: Node;
      if (!cell) {
        pNode = schema.nodes["tableParagraph"].create({});
      } else if (typeof cell === "string") {
        pNode = schema.nodes["tableParagraph"].create({}, schema.text(cell));
      } else {
        const textNodes = inlineContentToNodes(cell, schema, styleSchema);
        pNode = schema.nodes["tableParagraph"].create({}, textNodes);
      }

      const cellNode = schema.nodes["tableCell"].create({}, pNode);
      columnNodes.push(cellNode);
    }
    const rowNode = schema.nodes["tableRow"].create({}, columnNodes);
    rowNodes.push(rowNode);
  }
  return rowNodes;
}

function blockOrInlineContentToContentNode(
  block:
    | PartialBlock<any, any, any>
    | PartialCustomInlineContentFromConfig<any, any>,
  schema: Schema,
  styleSchema: StyleSchema
) {
  let contentNode: Node;
  let type = block.type;

  // TODO: needed? came from previous code
  if (type === undefined) {
    type = "paragraph";
  }

  if (!schema.nodes[type]) {
    throw new Error(`node type ${type} not found in schema`);
  }

  if (!block.content) {
    contentNode = schema.nodes[type].create(block.props);
  } else if (typeof block.content === "string") {
    const nodes = inlineContentToNodes([block.content], schema, styleSchema);
    contentNode = schema.nodes[type].create(block.props, nodes);
  } else if (Array.isArray(block.content)) {
    const nodes = inlineContentToNodes(block.content, schema, styleSchema);
    contentNode = schema.nodes[type].create(block.props, nodes);
  } else if (block.content.type === "tableContent") {
    const nodes = tableContentToNodes(block.content, schema, styleSchema);
    contentNode = schema.nodes[type].create(block.props, nodes);
  } else {
    throw new UnreachableCaseError(block.content.type);
  }
  return contentNode;
}
/**
 * Converts a BlockNote block to a TipTap node.
 */
export function blockToNode(
  block: PartialBlock<any, any, any>,
  schema: Schema,
  styleSchema: StyleSchema
) {
  let id = block.id;

  if (id === undefined) {
    id = UniqueID.options.generateID();
  }

  const contentNode = blockOrInlineContentToContentNode(
    block,
    schema,
    styleSchema
  );

  const children: Node[] = [];

  if (block.children) {
    for (const child of block.children) {
      children.push(blockToNode(child, schema, styleSchema));
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
 * Converts an internal (prosemirror) table node contentto a BlockNote Tablecontent
 */
function contentNodeToTableContent<
  I extends InlineContentSchema,
  S extends StyleSchema
>(contentNode: Node, inlineContentSchema: I, styleSchema: S) {
  const ret: TableContent<I, S> = {
    type: "tableContent",
    rows: [],
  };

  contentNode.content.forEach((rowNode) => {
    const row: TableContent<I, S>["rows"][0] = {
      cells: [],
    };

    rowNode.content.forEach((cellNode) => {
      row.cells.push(
        cellNode.firstChild
          ? contentNodeToInlineContent(
              cellNode.firstChild,
              inlineContentSchema,
              styleSchema
            )
          : []
      );
    });

    ret.rows.push(row);
  });

  return ret;
}

/**
 * Converts an internal (prosemirror) content node to a BlockNote InlineContent array.
 */
export function contentNodeToInlineContent<
  I extends InlineContentSchema,
  S extends StyleSchema
>(contentNode: Node, inlineContentSchema: I, styleSchema: S) {
  const content: InlineContent<any, S>[] = [];
  let currentContent: InlineContent<any, S> | undefined = undefined;

  // Most of the logic below is for handling links because in ProseMirror links are marks
  // while in BlockNote links are a type of inline content
  contentNode.content.forEach((node) => {
    // hardBreak nodes do not have an InlineContent equivalent, instead we
    // add a newline to the previous node.
    if (node.type.name === "hardBreak") {
      if (currentContent) {
        // Current content exists.
        if (isStyledTextInlineContent(currentContent)) {
          // Current content is text.
          currentContent.text += "\n";
        } else if (isLinkInlineContent(currentContent)) {
          // Current content is a link.
          currentContent.content[currentContent.content.length - 1].text +=
            "\n";
        } else {
          throw new Error("unexpected");
        }
      } else {
        // Current content does not exist.
        currentContent = {
          type: "text",
          text: "\n",
          styles: {},
        };
      }

      return;
    }

    if (
      node.type.name !== "link" &&
      node.type.name !== "text" &&
      inlineContentSchema[node.type.name]
    ) {
      if (currentContent) {
        content.push(currentContent);
        currentContent = undefined;
      }

      content.push(
        nodeToCustomInlineContent(node, inlineContentSchema, styleSchema)
      );

      return;
    }

    const styles: Styles<S> = {};
    let linkMark: Mark | undefined;

    for (const mark of node.marks) {
      if (mark.type.name === "link") {
        linkMark = mark;
      } else {
        const config = styleSchema[mark.type.name];
        if (!config) {
          throw new Error(`style ${mark.type.name} not found in styleSchema`);
        }
        if (config.propSchema === "boolean") {
          (styles as any)[config.type] = true;
        } else if (config.propSchema === "string") {
          (styles as any)[config.type] = mark.attrs.stringValue;
        } else {
          throw new UnreachableCaseError(config.propSchema);
        }
      }
    }

    // Parsing links and text.
    // Current content exists.
    if (currentContent) {
      // Current content is text.
      if (isStyledTextInlineContent(currentContent)) {
        if (!linkMark) {
          // Node is text (same type as current content).
          if (
            JSON.stringify(currentContent.styles) === JSON.stringify(styles)
          ) {
            // Styles are the same.
            currentContent.text += node.textContent;
          } else {
            // Styles are different.
            content.push(currentContent);
            currentContent = {
              type: "text",
              text: node.textContent,
              styles,
            };
          }
        } else {
          // Node is a link (different type to current content).
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
      } else if (isLinkInlineContent(currentContent)) {
        // Current content is a link.
        if (linkMark) {
          // Node is a link (same type as current content).
          // Link URLs are the same.
          if (currentContent.href === linkMark.attrs.href) {
            // Styles are the same.
            if (
              JSON.stringify(
                currentContent.content[currentContent.content.length - 1].styles
              ) === JSON.stringify(styles)
            ) {
              currentContent.content[currentContent.content.length - 1].text +=
                node.textContent;
            } else {
              // Styles are different.
              currentContent.content.push({
                type: "text",
                text: node.textContent,
                styles,
              });
            }
          } else {
            // Link URLs are different.
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
        } else {
          // Node is text (different type to current content).
          content.push(currentContent);
          currentContent = {
            type: "text",
            text: node.textContent,
            styles,
          };
        }
      } else {
        // TODO
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

  return content as InlineContent<I, S>[];
}

export function nodeToCustomInlineContent<
  I extends InlineContentSchema,
  S extends StyleSchema
>(node: Node, inlineContentSchema: I, styleSchema: S): InlineContent<I, S> {
  if (node.type.name === "text" || node.type.name === "link") {
    throw new Error("unexpected");
  }
  const props: any = {};
  const icConfig = inlineContentSchema[
    node.type.name
  ] as CustomInlineContentConfig;
  for (const [attr, value] of Object.entries(node.attrs)) {
    if (!icConfig) {
      throw Error("ic node is of an unrecognized type: " + node.type.name);
    }

    const propSchema = icConfig.propSchema;

    if (attr in propSchema) {
      props[attr] = value;
    }
  }

  let content: CustomInlineContentFromConfig<any, any>["content"];

  if (icConfig.content === "styled") {
    content = contentNodeToInlineContent(
      node,
      inlineContentSchema,
      styleSchema
    ) as any; // TODO: is this safe? could we have Links here that are undesired?
  } else {
    content = undefined;
  }

  const ic = {
    type: node.type.name,
    props,
    content,
  } as InlineContentFromConfig<I[keyof I], S>;
  return ic;
}

/**
 * Convert a TipTap node to a BlockNote block.
 */
export function nodeToBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  node: Node,
  blockSchema: BSchema,
  inlineContentSchema: I,
  styleSchema: S,
  blockCache?: WeakMap<Node, Block<BSchema, I, S>>
): Block<BSchema, I, S> {
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

  const blockInfo = getBlockInfo(node);

  let id = blockInfo.id;

  // Only used for blocks converted from other formats.
  if (id === null) {
    id = UniqueID.options.generateID();
  }

  const props: any = {};
  for (const [attr, value] of Object.entries({
    ...node.attrs,
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
  }

  const blockConfig = blockSchema[blockInfo.contentType.name];

  const children: Block<BSchema, I, S>[] = [];
  for (let i = 0; i < blockInfo.numChildBlocks; i++) {
    children.push(
      nodeToBlock(
        node.lastChild!.child(i),
        blockSchema,
        inlineContentSchema,
        styleSchema,
        blockCache
      )
    );
  }

  let content: Block<any, any, any>["content"];

  if (blockConfig.content === "inline") {
    content = contentNodeToInlineContent(
      blockInfo.contentNode,
      inlineContentSchema,
      styleSchema
    );
  } else if (blockConfig.content === "table") {
    content = contentNodeToTableContent(
      blockInfo.contentNode,
      inlineContentSchema,
      styleSchema
    );
  } else if (blockConfig.content === "none") {
    content = undefined;
  } else {
    throw new UnreachableCaseError(blockConfig.content);
  }

  const block = {
    id,
    type: blockConfig.type,
    props,
    content,
    children,
  } as Block<BSchema, I, S>;

  blockCache?.set(node, block);

  return block;
}

// fragmentOfFirstBlock: InlineContent<I, S>[];
// fragmentOfLastBlock: InlineContent<I, S>[];
// // blocks: Array<Block<BSchema, I, S>>;
/**
 *
 * Parse a Prosemirror Slice into a BlockNote selection. The prosemirror schema looks like this:
 *
 * <blockGroup>
 *   <blockContainer> (main content of block)
 *       <p, heading, etc.>
 *   <blockGroup> (only if blocks has children)
 *     <blockContainer> (child block)
 *       <p, heading, etc.>
 *     </blockContainer>
 *    <blockContainer> (child block 2)
 *       <p, heading, etc.>
 *     </blockContainer>
 *   </blockContainer>
 *  </blockGroup>
 * </blockGroup>
 *
 * Examples,
 *
 * for slice:
 *
 * {"content":[{"type":"blockGroup","content":[{"type":"blockContainer","attrs":{"id":"1","textColor":"yellow","backgroundColor":"blue"},"content":[{"type":"heading","attrs":{"textAlignment":"right","level":2},"content":[{"type":"text","marks":[{"type":"bold"},{"type":"underline"}],"text":"ding "},{"type":"text","marks":[{"type":"italic"},{"type":"strike"}],"text":"2"}]},{"type":"blockGroup","content":[{"type":"blockContainer","attrs":{"id":"2","textColor":"default","backgroundColor":"red"},"content":[{"type":"paragraph","attrs":{"textAlignment":"left"},"content":[{"type":"text","text":"Par"}]}]}]}]}]}],"openStart":3,"openEnd":5}
 *
 * should return:
 *
 * [
 *   {
 *     block: {
 *       nodeToBlock(first blockContainer node),
 *       children: [
 *         {
 *           block: nodeToBlock(second blockContainer node),
 *           contentCutAtEnd: true,
 *           childrenCutAtEnd: false,
 *         },
 *       ],
 *     },
 *      contentCutAtStart: true,
 *     contentCutAtEnd: false,
 *     childrenCutAtEnd: true,
 *   },
 * ]
 */

export type BlockWithSelectionInfo<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  block: Block<BSchema, I, S> & {
    children: BlockWithSelectionInfo<BSchema, I, S>[];
  };
  contentCutAtStart: boolean;
  contentCutAtEnd: boolean;
};

export function sliceToBlockNote<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  slice: Slice,
  blockSchema: BSchema,
  inlineContentSchema: I,
  styleSchema: S,
  blockCache?: WeakMap<Node, Block<BSchema, I, S>>
): {
  blocks: BlockWithSelectionInfo<BSchema, I, S>[];
} {
  // console.log(JSON.stringify(slice.toJSON()));
  function processNode(
    node: Node,
    openStart: number,
    openEnd: number
  ): BlockWithSelectionInfo<BSchema, I, S>[] {
    if (node.type.name !== "blockGroup") {
      throw new Error("unexpected");
    }
    const blocks: BlockWithSelectionInfo<BSchema, I, S>[] = [];

    node.forEach((blockContainer, _offset, index) => {
      if (blockContainer.type.name !== "blockContainer") {
        throw new Error("unexpected");
      }
      if (blockContainer.childCount === 0) {
        return;
      }
      if (blockContainer.childCount === 0 || blockContainer.childCount > 2) {
        throw new Error(
          "unexpected, blockContainer.childCount: " + blockContainer.childCount
        );
      }

      const isFirstBlock = index === 0;
      const isLastBlock = index === node.childCount - 1;

      if (blockContainer.firstChild!.type.name === "blockGroup") {
        // this is the parent where a selection starts within one of its children,
        // e.g.:
        // A
        // ├── B
        // selection starts within B, then this blockContainer is A, but we don't care about A
        // so let's descend into B and continue processing
        if (!isFirstBlock) {
          throw new Error("unexpected");
        }
        blocks.push(
          ...processNode(
            blockContainer.firstChild!,
            Math.max(0, openStart - 1),
            isLastBlock ? Math.max(0, openEnd - 1) : 0
          )
        );
        return;
      }

      const block = nodeToBlock(
        blockContainer,
        blockSchema,
        inlineContentSchema,
        styleSchema,
        blockCache
      );
      const childGroup =
        blockContainer.childCount > 1 ? blockContainer.child(1) : undefined;

      let childBlocks: BlockWithSelectionInfo<BSchema, I, S>[] = [];
      if (childGroup) {
        childBlocks = processNode(
          childGroup,
          0, // TODO: can this be anything other than 0?
          isLastBlock ? Math.max(0, openEnd - 1) : 0
        );
      }

      blocks.push({
        block: {
          ...(block as any),
          children: childBlocks,
        },
        contentCutAtStart: openStart > 1 && isFirstBlock,
        contentCutAtEnd: !!(openEnd > 1 && isLastBlock && !childGroup),
      });
    });

    return blocks;
  }

  if (slice.content.childCount === 0) {
    return {
      blocks: [],
    };
  }

  if (slice.content.childCount !== 1) {
    throw new Error(
      "slice must be a single block, did you forget includeParents=true?"
    );
  }

  return {
    blocks: processNode(
      slice.content.firstChild!,
      Math.max(slice.openStart - 1, 0),
      Math.max(slice.openEnd - 1, 0)
    ),
  };
}
