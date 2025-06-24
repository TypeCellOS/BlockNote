import { Attrs, Fragment, Mark, Node, Schema } from "@tiptap/pm/model";

import UniqueID from "../../extensions/UniqueID/UniqueID.js";
import type {
  InlineContentSchema,
  PartialCustomInlineContentFromConfig,
  PartialInlineContent,
  PartialLink,
  PartialTableContent,
  StyleSchema,
  StyledText,
} from "../../schema";

import type { PartialBlock } from "../../blocks/defaultBlocks";
import {
  isPartialLinkInlineContent,
  isStyledTextInlineContent,
} from "../../schema/inlineContent/types.js";
import { getColspan, isPartialTableCell } from "../../util/table.js";
import { UnreachableCaseError } from "../../util/typescript.js";
import { getAbsoluteTableCells } from "../blockManipulation/tables/tables.js";
import { getStyleSchema } from "../pmUtil.js";

/**
 * Convert a StyledText inline element to a
 * prosemirror text node with the appropriate marks
 */
function styledTextToNodes<T extends StyleSchema>(
  styledText: StyledText<T>,
  schema: Schema,
  styleSchema: T,
  blockType?: string,
): Node[] {
  const marks: Mark[] = [];

  for (const [style, value] of Object.entries(styledText.styles || {})) {
    const config = styleSchema[style];
    if (!config) {
      throw new Error(`style ${style} not found in styleSchema`);
    }

    if (config.propSchema === "boolean") {
      if (value) {
        marks.push(schema.mark(style));
      }
    } else if (config.propSchema === "string") {
      if (value) {
        marks.push(schema.mark(style, { stringValue: value }));
      }
    } else {
      throw new UnreachableCaseError(config.propSchema);
    }
  }

  const parseHardBreaks = !blockType || !schema.nodes[blockType].spec.code;

  if (!parseHardBreaks) {
    return styledText.text.length > 0
      ? [schema.text(styledText.text, marks)]
      : [];
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
          return schema.nodes["hardBreak"].createChecked();
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
  styleSchema: StyleSchema,
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
    },
  );
}

/**
 * Converts an array of StyledText inline content elements to
 * prosemirror text nodes with the appropriate marks
 */
function styledTextArrayToNodes<S extends StyleSchema>(
  content: string | StyledText<S>[],
  schema: Schema,
  styleSchema: S,
  blockType?: string,
): Node[] {
  const nodes: Node[] = [];

  if (typeof content === "string") {
    nodes.push(
      ...styledTextToNodes(
        { type: "text", text: content, styles: {} },
        schema,
        styleSchema,
        blockType,
      ),
    );
    return nodes;
  }

  for (const styledText of content) {
    nodes.push(
      ...styledTextToNodes(styledText, schema, styleSchema, blockType),
    );
  }
  return nodes;
}

/**
 * converts an array of inline content elements to prosemirror nodes
 */
export function inlineContentToNodes<
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  blockContent: PartialInlineContent<I, S>,
  schema: Schema,
  blockType?: string,
  styleSchema: S = getStyleSchema(schema),
): Node[] {
  const nodes: Node[] = [];

  for (const content of blockContent) {
    if (typeof content === "string") {
      nodes.push(
        ...styledTextArrayToNodes(content, schema, styleSchema, blockType),
      );
    } else if (isPartialLinkInlineContent(content)) {
      nodes.push(...linkToNodes(content, schema, styleSchema));
    } else if (isStyledTextInlineContent(content)) {
      nodes.push(
        ...styledTextArrayToNodes([content], schema, styleSchema, blockType),
      );
    } else {
      nodes.push(
        blockOrInlineContentToContentNode(content, schema, styleSchema),
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
  S extends StyleSchema,
>(
  tableContent: PartialTableContent<I, S>,
  schema: Schema,
  styleSchema: StyleSchema = getStyleSchema(schema),
): Node[] {
  const rowNodes: Node[] = [];
  // Header rows and columns are used to determine the type of the cell
  // If headerRows is 1, then the first row is a header row
  const headerRows = new Array(tableContent.headerRows ?? 0).fill(true);
  // If headerCols is 1, then the first column is a header column
  const headerCols = new Array(tableContent.headerCols ?? 0).fill(true);

  const columnWidths: (number | undefined)[] = tableContent.columnWidths ?? [];

  for (let rowIndex = 0; rowIndex < tableContent.rows.length; rowIndex++) {
    const row = tableContent.rows[rowIndex];
    const columnNodes: Node[] = [];
    const isHeaderRow = headerRows[rowIndex];
    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex++) {
      const cell = row.cells[cellIndex];
      const isHeaderCol = headerCols[cellIndex];
      /**
       * The attributes of the cell to apply to the node
       */
      const attrs: Attrs | undefined = undefined;
      /**
       * The content of the cell to apply to the node
       */
      let content: Fragment | Node | readonly Node[] | null = null;

      // Colwidths are absolutely referenced to the table, so we need to resolve the relative cell index to the absolute cell index
      const absoluteCellIndex = getAbsoluteTableCells(
        {
          row: rowIndex,
          col: cellIndex,
        },
        { type: "table", content: tableContent } as any,
      );

      // Assume the column width is the width of the cell at the absolute cell index
      let colwidth: (number | undefined)[] | null = columnWidths[
        absoluteCellIndex.col
      ]
        ? [columnWidths[absoluteCellIndex.col]]
        : null;

      if (!cell) {
        // No-op
      } else if (typeof cell === "string") {
        content = schema.text(cell);
      } else if (isPartialTableCell(cell)) {
        if (cell.content) {
          content = inlineContentToNodes(
            cell.content,
            schema,
            "tableParagraph",
            styleSchema,
          );
        }
        const colspan = getColspan(cell);

        if (colspan > 1) {
          // If the cell has a > 1 colspan, we need to get the column width for each cell in the span
          colwidth = new Array(colspan).fill(false).map((_, i) => {
            // Starting from the absolute column index, get the column width for each cell in the span
            return columnWidths[absoluteCellIndex.col + i] ?? undefined;
          });
        }
      } else {
        content = inlineContentToNodes(
          cell,
          schema,
          "tableParagraph",
          styleSchema,
        );
      }

      const cellNode = schema.nodes[
        isHeaderCol || isHeaderRow ? "tableHeader" : "tableCell"
      ].createChecked(
        {
          ...(isPartialTableCell(cell) ? cell.props : {}),
          colwidth,
        },
        schema.nodes["tableParagraph"].createChecked(attrs, content),
      );
      columnNodes.push(cellNode);
    }

    const rowNode = schema.nodes["tableRow"].createChecked({}, columnNodes);
    rowNodes.push(rowNode);
  }
  return rowNodes;
}

function blockOrInlineContentToContentNode(
  block:
    | PartialBlock<any, any, any>
    | PartialCustomInlineContentFromConfig<any, any>,
  schema: Schema,
  styleSchema: StyleSchema,
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
    contentNode = schema.nodes[type].createChecked(block.props);
  } else if (typeof block.content === "string") {
    const nodes = inlineContentToNodes(
      [block.content],
      schema,
      type,
      styleSchema,
    );
    contentNode = schema.nodes[type].createChecked(block.props, nodes);
  } else if (Array.isArray(block.content)) {
    const nodes = inlineContentToNodes(
      block.content,
      schema,
      type,
      styleSchema,
    );
    contentNode = schema.nodes[type].createChecked(block.props, nodes);
  } else if (block.content.type === "tableContent") {
    const nodes = tableContentToNodes(block.content, schema, styleSchema);
    contentNode = schema.nodes[type].createChecked(block.props, nodes);
  } else {
    throw new UnreachableCaseError(block.content.type);
  }
  return contentNode;
}

/**
 * Converts a BlockNote block to a Prosemirror node.
 */
export function blockToNode(
  block: PartialBlock<any, any, any>,
  schema: Schema,
  styleSchema: StyleSchema = getStyleSchema(schema),
) {
  let id = block.id;

  if (id === undefined) {
    id = UniqueID.options.generateID();
  }

  const children: Node[] = [];

  if (block.children) {
    for (const child of block.children) {
      children.push(blockToNode(child, schema, styleSchema));
    }
  }

  const isBlockContent =
    !block.type || // can happen if block.type is not defined (this should create the default node)
    schema.nodes[block.type].isInGroup("blockContent");

  if (isBlockContent) {
    // Blocks with a type that matches "blockContent" group always need to be wrapped in a blockContainer

    const contentNode = blockOrInlineContentToContentNode(
      block,
      schema,
      styleSchema,
    );

    const groupNode =
      children.length > 0
        ? schema.nodes["blockGroup"].createChecked({}, children)
        : undefined;

    return schema.nodes["blockContainer"].createChecked(
      {
        id: id,
        ...block.props,
      },
      groupNode ? [contentNode, groupNode] : contentNode,
    );
  } else if (schema.nodes[block.type].isInGroup("bnBlock")) {
    // this is a bnBlock node like Column or ColumnList that directly translates to a prosemirror node
    return schema.nodes[block.type].createChecked(
      {
        id: id,
        ...block.props,
      },
      children,
    );
  } else {
    throw new Error(
      `block type ${block.type} doesn't match blockContent or bnBlock group`,
    );
  }
}
