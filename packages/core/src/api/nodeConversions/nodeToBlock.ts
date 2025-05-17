import { Mark, Node, Schema, Slice } from "@tiptap/pm/model";
import type { Block } from "../../blocks/defaultBlocks.js";
import UniqueID from "../../extensions/UniqueID/UniqueID.js";
import type {
  BlockSchema,
  CustomInlineContentConfig,
  CustomInlineContentFromConfig,
  InlineContent,
  InlineContentFromConfig,
  InlineContentSchema,
  StyleSchema,
  Styles,
  TableCell,
  TableContent,
} from "../../schema/index.js";
import {
  isLinkInlineContent,
  isStyledTextInlineContent,
} from "../../schema/inlineContent/types.js";
import { UnreachableCaseError } from "../../util/typescript.js";
import { getBlockInfoWithManualOffset } from "../getBlockInfoFromPos.js";
import {
  getBlockCache,
  getBlockSchema,
  getInlineContentSchema,
  getStyleSchema,
} from "../pmUtil.js";

/**
 * Converts an internal (prosemirror) table node contentto a BlockNote Tablecontent
 */
export function contentNodeToTableContent<
  I extends InlineContentSchema,
  S extends StyleSchema,
>(contentNode: Node, inlineContentSchema: I, styleSchema: S) {
  const ret: TableContent<I, S> = {
    type: "tableContent",
    columnWidths: [],
    headerRows: undefined,
    headerCols: undefined,
    rows: [],
  };

  /**
   * A matrix of boolean values indicating whether a cell is a header.
   * The first index is the row index, the second index is the cell index.
   */
  const headerMatrix: boolean[][] = [];

  contentNode.content.forEach((rowNode, _offset, rowIndex) => {
    const row: TableContent<I, S>["rows"][0] = {
      cells: [],
    };

    if (rowIndex === 0) {
      rowNode.content.forEach((cellNode) => {
        let colWidth = cellNode.attrs.colwidth as null | undefined | number[];
        if (colWidth === undefined || colWidth === null) {
          colWidth = new Array(cellNode.attrs.colspan ?? 1).fill(undefined);
        }
        ret.columnWidths.push(...colWidth);
      });
    }

    row.cells = rowNode.content.content.map((cellNode, cellIndex) => {
      if (!headerMatrix[rowIndex]) {
        headerMatrix[rowIndex] = [];
      }
      // Mark the cell as a header if it is a tableHeader node.
      headerMatrix[rowIndex][cellIndex] = cellNode.type.name === "tableHeader";
      // Convert cell content to inline content and merge adjacent styled text nodes
      const content = cellNode.content.content
        .map((child) =>
          contentNodeToInlineContent(child, inlineContentSchema, styleSchema),
        )
        // The reason that we merge this content is that we allow table cells to contain multiple tableParagraph nodes
        // So that we can leverage prosemirror-tables native merging
        // If the schema only allowed a single tableParagraph node, then the merging would not work and cause prosemirror to fit the content into a new cell
        .reduce(
          (acc, contentPartial) => {
            if (!acc.length) {
              return contentPartial;
            }

            const last = acc[acc.length - 1];
            const first = contentPartial[0];

            // Only merge if the last and first content are both styled text nodes and have the same styles
            if (
              first &&
              isStyledTextInlineContent(last) &&
              isStyledTextInlineContent(first) &&
              JSON.stringify(last.styles) === JSON.stringify(first.styles)
            ) {
              // Join them together if they have the same styles
              last.text += "\n" + first.text;
              acc.push(...contentPartial.slice(1));
              return acc;
            }
            acc.push(...contentPartial);
            return acc;
          },
          [] as InlineContent<I, S>[],
        );

      return {
        type: "tableCell",
        content,
        props: {
          colspan: cellNode.attrs.colspan,
          rowspan: cellNode.attrs.rowspan,
          backgroundColor: cellNode.attrs.backgroundColor,
          textColor: cellNode.attrs.textColor,
          textAlignment: cellNode.attrs.textAlignment,
        },
      } satisfies TableCell<I, S>;
    });

    ret.rows.push(row);
  });

  for (let i = 0; i < headerMatrix.length; i++) {
    if (headerMatrix[i]?.every((isHeader) => isHeader)) {
      ret.headerRows = (ret.headerRows ?? 0) + 1;
    }
  }

  for (let i = 0; i < headerMatrix[0]?.length; i++) {
    if (headerMatrix?.every((row) => row[i])) {
      ret.headerCols = (ret.headerCols ?? 0) + 1;
    }
  }

  return ret;
}

/**
 * Converts an internal (prosemirror) content node to a BlockNote InlineContent array.
 */
export function contentNodeToInlineContent<
  I extends InlineContentSchema,
  S extends StyleSchema,
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

    if (node.type.name !== "link" && node.type.name !== "text") {
      if (!inlineContentSchema[node.type.name]) {
        // eslint-disable-next-line no-console
        console.warn("unrecognized inline content type", node.type.name);
        return;
      }
      if (currentContent) {
        content.push(currentContent);
        currentContent = undefined;
      }

      content.push(
        nodeToCustomInlineContent(node, inlineContentSchema, styleSchema),
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
          if (mark.type.spec.blocknoteIgnore) {
            // at this point, we don't want to show certain marks (such as comments)
            // in the BlockNote JSON output. These marks should be tagged with "blocknoteIgnore" in the spec
            continue;
          }
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
                currentContent.content[currentContent.content.length - 1]
                  .styles,
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
  S extends StyleSchema,
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
      styleSchema,
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
 * Convert a Prosemirror node to a BlockNote block.
 *
 * TODO: test changes
 */
export function nodeToBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  node: Node,
  schema: Schema,
  blockSchema: BSchema = getBlockSchema(schema) as BSchema,
  inlineContentSchema: I = getInlineContentSchema(schema) as I,
  styleSchema: S = getStyleSchema(schema) as S,
  blockCache = getBlockCache(schema),
): Block<BSchema, I, S> {
  if (!node.type.isInGroup("bnBlock")) {
    throw Error("Node should be a bnBlock, but is instead: " + node.type.name);
  }

  const cachedBlock = blockCache?.get(node);

  if (cachedBlock) {
    return cachedBlock;
  }

  const blockInfo = getBlockInfoWithManualOffset(node, 0);

  let id = blockInfo.bnBlock.node.attrs.id;

  // Only used for blocks converted from other formats.
  if (id === null) {
    id = UniqueID.options.generateID();
  }

  const blockSpec = blockSchema[blockInfo.blockNoteType];

  if (!blockSpec) {
    throw Error("Block is of an unrecognized type: " + blockInfo.blockNoteType);
  }

  const props: any = {};
  for (const [attr, value] of Object.entries({
    ...node.attrs,
    ...(blockInfo.isBlockContainer ? blockInfo.blockContent.node.attrs : {}),
  })) {
    const propSchema = blockSpec.propSchema;

    if (
      attr in propSchema &&
      !(propSchema[attr].default === undefined && value === undefined)
    ) {
      props[attr] = value;
    }
  }

  const blockConfig = blockSchema[blockInfo.blockNoteType];

  const children: Block<BSchema, I, S>[] = [];
  blockInfo.childContainer?.node.forEach((child) => {
    children.push(
      nodeToBlock(
        child,
        schema,
        blockSchema,
        inlineContentSchema,
        styleSchema,
        blockCache,
      ),
    );
  });

  let content: Block<any, any, any>["content"];

  if (blockConfig.content === "inline") {
    if (!blockInfo.isBlockContainer) {
      throw new Error("impossible");
    }
    content = contentNodeToInlineContent(
      blockInfo.blockContent.node,
      inlineContentSchema,
      styleSchema,
    );
  } else if (blockConfig.content === "table") {
    if (!blockInfo.isBlockContainer) {
      throw new Error("impossible");
    }
    content = contentNodeToTableContent(
      blockInfo.blockContent.node,
      inlineContentSchema,
      styleSchema,
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

/**
 * Convert a Prosemirror document to a BlockNote document (array of blocks)
 */
export function docToBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  doc: Node,
  schema: Schema,
  blockSchema: BSchema = getBlockSchema(schema) as BSchema,
  inlineContentSchema: I = getInlineContentSchema(schema) as I,
  styleSchema: S = getStyleSchema(schema) as S,
  blockCache = getBlockCache(schema),
) {
  const blocks: Block<BSchema, I, S>[] = [];
  doc.firstChild!.descendants((node) => {
    blocks.push(
      nodeToBlock(
        node,
        schema,
        blockSchema,
        inlineContentSchema,
        styleSchema,
        blockCache,
      ),
    );
    return false;
  });
  return blocks;
}

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
 */
export function prosemirrorSliceToSlicedBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  slice: Slice,
  schema: Schema,
  blockSchema: BSchema = getBlockSchema(schema) as BSchema,
  inlineContentSchema: I = getInlineContentSchema(schema) as I,
  styleSchema: S = getStyleSchema(schema) as S,
  blockCache: WeakMap<Node, Block<BSchema, I, S>> = getBlockCache(schema),
): {
  /**
   * The blocks that are included in the selection.
   */
  blocks: Block<BSchema, I, S>[];
  /**
   * If a block was "cut" at the start of the selection, this will be the id of the block that was cut.
   */
  blockCutAtStart: string | undefined;
  /**
   * If a block was "cut" at the end of the selection, this will be the id of the block that was cut.
   */
  blockCutAtEnd: string | undefined;
} {
  // console.log(JSON.stringify(slice.toJSON()));
  function processNode(
    node: Node,
    openStart: number,
    openEnd: number,
  ): {
    blocks: Block<BSchema, I, S>[];
    blockCutAtStart: string | undefined;
    blockCutAtEnd: string | undefined;
  } {
    if (node.type.name !== "blockGroup") {
      throw new Error("unexpected");
    }
    const blocks: Block<BSchema, I, S>[] = [];
    let blockCutAtStart: string | undefined;
    let blockCutAtEnd: string | undefined;

    node.forEach((blockContainer, _offset, index) => {
      if (blockContainer.type.name !== "blockContainer") {
        throw new Error("unexpected");
      }
      if (blockContainer.childCount === 0) {
        return;
      }
      if (blockContainer.childCount === 0 || blockContainer.childCount > 2) {
        throw new Error(
          "unexpected, blockContainer.childCount: " + blockContainer.childCount,
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
        const ret = processNode(
          blockContainer.firstChild!,
          Math.max(0, openStart - 1),
          isLastBlock ? Math.max(0, openEnd - 1) : 0,
        );
        blockCutAtStart = ret.blockCutAtStart;
        if (isLastBlock) {
          blockCutAtEnd = ret.blockCutAtEnd;
        }
        blocks.push(...ret.blocks);
        return;
      }

      const block = nodeToBlock(
        blockContainer,
        schema,
        blockSchema,
        inlineContentSchema,
        styleSchema,
        blockCache,
      );
      const childGroup =
        blockContainer.childCount > 1 ? blockContainer.child(1) : undefined;

      let childBlocks: Block<BSchema, I, S>[] = [];
      if (childGroup) {
        const ret = processNode(
          childGroup,
          0, // TODO: can this be anything other than 0?
          isLastBlock ? Math.max(0, openEnd - 1) : 0,
        );
        childBlocks = ret.blocks;
        if (isLastBlock) {
          blockCutAtEnd = ret.blockCutAtEnd;
        }
      }

      if (isLastBlock && !childGroup && openEnd > 1) {
        blockCutAtEnd = block.id;
      }

      if (isFirstBlock && openStart > 1) {
        blockCutAtStart = block.id;
      }

      blocks.push({
        ...(block as any),
        children: childBlocks,
      });
    });

    return { blocks, blockCutAtStart, blockCutAtEnd };
  }

  if (slice.content.childCount === 0) {
    return {
      blocks: [],
      blockCutAtStart: undefined,
      blockCutAtEnd: undefined,
    };
  }

  if (slice.content.childCount !== 1) {
    throw new Error(
      "slice must be a single block, did you forget includeParents=true?",
    );
  }

  return processNode(
    slice.content.firstChild!,
    Math.max(slice.openStart - 1, 0),
    Math.max(slice.openEnd - 1, 0),
  );
}
