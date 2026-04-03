import { Node, Schema, Slice } from "@tiptap/pm/model";
import type { Block } from "../../blocks/defaultBlocks.js";
import UniqueID from "../../extensions/tiptap-extensions/UniqueID/UniqueID.js";
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
  getPmSchema,
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
 * Extract styles from a PM node's marks, separating link href from style marks.
 */
function extractMarks<S extends StyleSchema>(
  node: Node,
  styleSchema: S,
): { styles: Styles<S>; href: string | undefined } {
  const styles: Styles<S> = {};
  let href: string | undefined;

  for (const mark of node.marks) {
    if (mark.type.name === "link") {
      href = mark.attrs.href;
    } else {
      const config = styleSchema[mark.type.name];
      if (!config) {
        if (mark.type.spec.blocknoteIgnore) {
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

  return { styles, href };
}

// A flattened record representing one PM text node's contribution.
type FlatTextRecord<S extends StyleSchema> = {
  kind: "text";
  text: string;
  styles: Styles<S>;
  href: string | undefined;
};

type FlatRecord<S extends StyleSchema> =
  | FlatTextRecord<S>
  | { kind: "custom"; node: Node };

/**
 * Converts an internal (prosemirror) content node to a BlockNote InlineContent array.
 *
 * Two-pass approach:
 *  1. Flatten each PM child node into a simple record (text + styles + optional href, or custom node)
 *  2. Merge consecutive records with the same href/styles into StyledText or Link objects
 */
export function contentNodeToInlineContent<
  I extends InlineContentSchema,
  S extends StyleSchema,
>(contentNode: Node, inlineContentSchema: I, styleSchema: S) {
  // Pass 1: Flatten PM nodes into records
  const records: FlatRecord<S>[] = [];

  contentNode.content.forEach((node) => {
    if (node.type.name === "hardBreak") {
      // Append newline to the previous text record, or create one
      const last = records[records.length - 1];
      if (last && last.kind === "text") {
        last.text += "\n";
      } else {
        records.push({
          kind: "text",
          text: "\n",
          styles: {} as Styles<S>,
          href: undefined,
        });
      }
      return;
    }

    if (node.type.name === "text") {
      const { styles, href } = extractMarks(node, styleSchema);
      records.push({ kind: "text", text: node.textContent, styles, href });
      return;
    }

    // Custom inline content node
    if (!inlineContentSchema[node.type.name]) {
      // eslint-disable-next-line no-console
      console.warn("unrecognized inline content type", node.type.name);
      return;
    }
    records.push({ kind: "custom", node });
  });

  // Pass 2: Merge consecutive text records into StyledText / Link
  const content: InlineContent<any, S>[] = [];

  for (const record of records) {
    if (record.kind === "custom") {
      content.push(
        nodeToCustomInlineContent(record.node, inlineContentSchema, styleSchema),
      );
      continue;
    }

    const { text, styles, href } = record;
    const stylesKey = JSON.stringify(styles);
    const last = content[content.length - 1];

    if (href !== undefined) {
      // This text belongs to a link
      if (
        last &&
        isLinkInlineContent(last) &&
        last.href === href
      ) {
        // Same link — try to merge with the last StyledText inside it
        const lastChild = last.content[last.content.length - 1];
        if (JSON.stringify(lastChild.styles) === stylesKey) {
          lastChild.text += text;
        } else {
          last.content.push({ type: "text", text, styles });
        }
      } else {
        // New link
        content.push({
          type: "link",
          href,
          content: [{ type: "text", text, styles }],
        });
      }
    } else {
      // Plain text
      if (
        last &&
        isStyledTextInlineContent(last) &&
        JSON.stringify(last.styles) === stylesKey
      ) {
        last.text += text;
      } else {
        content.push({ type: "text", text, styles });
      }
    }
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
  schema: Schema = getPmSchema(doc),
  blockSchema: BSchema = getBlockSchema(schema) as BSchema,
  inlineContentSchema: I = getInlineContentSchema(schema) as I,
  styleSchema: S = getStyleSchema(schema) as S,
  blockCache = getBlockCache(schema),
) {
  const blocks: Block<BSchema, I, S>[] = [];
  if (doc.firstChild) {
    doc.firstChild.descendants((node) => {
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
  }
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
