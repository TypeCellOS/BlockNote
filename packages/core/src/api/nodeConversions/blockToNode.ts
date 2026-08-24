import {
  Attrs,
  Fragment,
  Mark,
  Node,
  NodeType,
  Schema,
} from "@tiptap/pm/model";

import UniqueID from "../../extensions/tiptap-extensions/UniqueID/UniqueID.js";
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
// `isContainerNode` comes from `children.js` directly (rather than via its
// `fixContainer.js` re-export) because `fixContainer.js` imports the seeding
// machinery below; going through it would create an import cycle.
import {
  getChildrenConfig,
  getContentContainerNodeTypes,
  isContainerNode,
  resolveChildren,
} from "../../schema/blocks/children.js";
import { getColspan, isPartialTableCell } from "../../util/table.js";
import { UnreachableCaseError } from "../../util/typescript.js";
import { getAbsoluteTableCells } from "../blockManipulation/tables/tables.js";
import {
  getBlockSchema,
  getStyleSchema,
  isPlainContentNodeType,
} from "../pmUtil.js";

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

  // Backwards compat: old BlockNote JSON may carry formatting marks (e.g. bold)
  // on a block whose content type is now "plain". Those marks aren't allowed on
  // the node, and would make `createChecked` throw when the block is assembled.
  // Drop them here (for plain blocks only) — comment/suggestion (annotation)
  // marks are allowed and kept by `allowedMarks`.
  const allowedMarks =
    blockType &&
    schema.nodes[blockType] &&
    isPlainContentNodeType(schema, schema.nodes[blockType])
      ? [...schema.nodes[blockType].allowedMarks(marks)]
      : marks;

  // Plain content nodes hold raw text — including newlines —
  // rather than inline content, so they can't contain `hardBreak` nodes. Keep
  // newlines as text characters for them instead of splitting into hard breaks.
  const parseHardBreaks =
    !blockType || !isPlainContentNodeType(schema, schema.nodes[blockType]);

  if (!parseHardBreaks) {
    return styledText.text.length > 0
      ? [schema.text(styledText.text, allowedMarks)]
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
          return schema.text(text, allowedMarks);
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

const EMPTY_SEEDING: ReadonlySet<string> = new Set();

function unwrapsWhenEmptied(blockType: string, schema: Schema): boolean {
  const blockConfig = getBlockSchema(schema)[blockType];
  const children = blockConfig ? getChildrenConfig(blockConfig) : undefined;
  return !!children && resolveChildren(children).whenEmptied === "unwrap";
}

// `createAndFill` produces nodes with `id: null`; patch them before use.
function withGeneratedIds(node: Node): Node {
  if (node.isText) {
    return node;
  }

  const children: Node[] = [];
  let childChanged = false;
  node.forEach((child) => {
    const next = withGeneratedIds(child);
    childChanged ||= next !== child;
    children.push(next);
  });

  const needsId = node.type.isInGroup("bnBlock") && node.attrs.id === null;
  if (!needsId && !childChanged) {
    return node;
  }

  return node.type.create(
    needsId ? { ...node.attrs, id: UniqueID.options.generateID() } : node.attrs,
    childChanged ? Fragment.from(children) : node.content,
    node.marks,
  );
}

function seedDefaultChildren(
  blockType: string,
  schema: Schema,
  styleSchema: StyleSchema,
  seedingTypes: ReadonlySet<string>,
): Node[] | undefined {
  const blockSchemaConfig = getBlockSchema(schema)[blockType];
  const childrenConfig = blockSchemaConfig
    ? getChildrenConfig(blockSchemaConfig)
    : undefined;

  if (!childrenConfig) {
    return undefined;
  }

  const defaultChildren = resolveChildren(childrenConfig).default;
  if (!defaultChildren || defaultChildren.length === 0) {
    return undefined;
  }

  if (seedingTypes.has(blockType)) {
    throw new Error(
      `Seeding "${blockType}" ends up seeding it again (${[...seedingTypes, blockType].join(" -> ")}). ` +
        "Give the cyclic default explicit children, or remove the self-reference.",
    );
  }

  const nextSeeding = new Set(seedingTypes).add(blockType);
  return defaultChildren.map((child) =>
    blockToNode(
      child as PartialBlock<any, any, any>,
      schema,
      styleSchema,
      nextSeeding,
    ),
  );
}

/**
 * The nodes `whenEmptied: "refill"` appends when a container's non-empty
 * children drop below `min`: the unconsumed tail of its `default`
 * (`default[from..min-1]`), each converted exactly like an inserted block.
 * Empty when the container has no `default`; the caller pads any remainder
 * with empty fill.
 */
export function seedRefillChildren(
  blockType: string,
  schema: Schema,
  from: number,
  min: number,
): Node[] {
  const blockConfig = getBlockSchema(schema)[blockType];
  const children = blockConfig ? getChildrenConfig(blockConfig) : undefined;
  const defaultChildren = children
    ? resolveChildren(children).default
    : undefined;
  if (!defaultChildren) {
    return [];
  }

  return defaultChildren
    .slice(from, min)
    .map((child) => blockToNode(child as PartialBlock<any, any, any>, schema));
}

function partialContentToInlineNodes(
  block: PartialBlock<any, any, any>,
  contentNodeName: string,
  schema: Schema,
  styleSchema: StyleSchema,
): Node[] {
  if (block.content === undefined) {
    return [];
  }
  if (typeof block.content === "string" || Array.isArray(block.content)) {
    return inlineContentToNodes(
      typeof block.content === "string" ? [block.content] : block.content,
      schema,
      contentNodeName,
      styleSchema,
    );
  }

  throw new Error(
    `Block "${block.type}" cannot have content of type "${block.content.type}".`,
  );
}

function createContainerChildrenNode(
  blockType: string,
  type: NodeType,
  schema: Schema,
  styleSchema: StyleSchema,
  seedingTypes: ReadonlySet<string>,
  attrs: Attrs | null = null,
): Node {
  const seeded = seedDefaultChildren(
    blockType,
    schema,
    styleSchema,
    seedingTypes,
  );

  if (!seeded && unwrapsWhenEmptied(blockType, schema)) {
    // Fill so the node satisfies its own content expression for the
    // `node.check()` that runs before the repair pass (e.g. in
    // `removeAndInsertBlocks`); that pass then unwraps the still-empty
    // container. Without the fill, a `min >= 1` unwrap container with no
    // `default` produces a schema-invalid node and `check()` throws.
    return type.createAndFill(attrs) ?? type.create(attrs);
  }

  const node = type.createAndFill(attrs, seeded);
  if (!node) {
    throw new Error(
      `Cannot create block "${blockType}": its \`default\` children don't fit its \`children\` config ` +
        `(it accepts \`${type.spec.content}\`).`,
    );
  }

  return node;
}

// Passes explicit children straight through for unwrap-on-empty containers
// (fill would be undone by the next repair pass) and for unfittable content
// (let `node.check()` report it). An empty child list is the exception: it
// still needs filling to survive the pre-repair `node.check()`.
function createExplicitChildrenNode(
  blockType: string,
  type: NodeType,
  schema: Schema,
  children: Node[],
  attrs: Attrs | null = null,
): Node {
  if (unwrapsWhenEmptied(blockType, schema)) {
    // An empty explicit `children: []` would leave a `min >= 1` container
    // schema-invalid and fail the pre-repair `node.check()`, so fill it (the
    // repair pass unwraps it). Non-empty explicit children are left as given.
    return children.length === 0
      ? (type.createAndFill(attrs) ?? type.create(attrs))
      : type.create(attrs, children);
  }

  return type.createAndFill(attrs, children) ?? type.create(attrs, children);
}

/**
 * Converts a BlockNote block to a Prosemirror node.
 */
export function blockToNode(
  block: PartialBlock<any, any, any>,
  schema: Schema,
  styleSchema: StyleSchema = getStyleSchema(schema),
  seedingTypes: ReadonlySet<string> = EMPTY_SEEDING,
) {
  let id = block.id;

  if (id === undefined) {
    id = UniqueID.options.generateID();
  }

  const children: Node[] = [];

  if (block.children) {
    for (const child of block.children) {
      children.push(blockToNode(child, schema, styleSchema, seedingTypes));
    }
  }

  const isBlockContent =
    !block.type || // can happen if block.type is not defined (this should create the default node)
    schema.nodes[block.type].isInGroup("blockContent");

  const contentContainerTypes = block.type
    ? getContentContainerNodeTypes(schema, block.type)
    : undefined;

  if (isBlockContent) {
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
  } else if (contentContainerTypes) {
    // A container with its own content: the content and the children each get
    // a node of their own, since a ProseMirror node holds either inline
    // content or block content but never both.
    const { contentType, childrenType } = contentContainerTypes;

    const contentNode = contentType.createChecked(
      null,
      partialContentToInlineNodes(block, contentType.name, schema, styleSchema),
    );

    const childrenNode =
      block.children !== undefined
        ? createExplicitChildrenNode(block.type, childrenType, schema, children)
        : createContainerChildrenNode(
            block.type,
            childrenType,
            schema,
            styleSchema,
            seedingTypes,
          );

    return withGeneratedIds(
      schema.nodes[block.type].create({ id: id, ...block.props }, [
        contentNode,
        childrenNode,
      ]),
    );
  } else if (
    schema.nodes[block.type].isInGroup("bnBlock") &&
    !getChildrenConfig(schema.nodes[block.type].spec.blockConfig ?? {})
  ) {
    // Legacy path for `@blocknote/xl-multi-column`'s hand-written PM nodes,
    // which sit in the `bnBlock` group but have no `children` config. Plain
    // `create` (not `createChecked` and no fill), so invalid structures
    // surface via `node.check()` when the caller mutates the doc. Removed
    // once multi-column is migrated onto the container API.
    return schema.nodes[block.type].create(
      {
        id: id,
        ...block.props,
      },
      children,
    );
  } else if (isContainerNode(schema.nodes[block.type])) {
    const type = schema.nodes[block.type];
    const attrs = { id: id, ...block.props };

    if (block.children !== undefined) {
      return withGeneratedIds(
        createExplicitChildrenNode(block.type, type, schema, children, attrs),
      );
    }

    return withGeneratedIds(
      createContainerChildrenNode(
        block.type,
        type,
        schema,
        styleSchema,
        seedingTypes,
        attrs,
      ),
    );
  } else {
    throw new Error(
      `block type ${block.type} doesn't match blockContent or bnBlock group`,
    );
  }
}
