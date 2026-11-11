/**
 * The block JSON that the lens uses. It is the `Block` JSON of BlockNote, with
 * structural types. Thus, the lens can use it without the schema of the editor.
 *
 * Note: `Block<BlockSchema, ...>` with the generic schema types does not
 * narrow. For example, its `content` type is `never`.
 *
 * FOLLOW-UP (later, not in the lens PR): move these types to core. Block
 * types of core that narrow for a generic schema can replace this file, and
 * the casts at the calls into core (for example `as PartialBlock`) go.
 */

/**
 * The styles of a text: `true` for a style that is on or off (bold), or a value (text color).
 *
 * @internal
 */
export type LensStyles = Record<string, string | boolean | undefined>;

/** @internal */
export type LensStyledText = { type: "text"; text: string; styles: LensStyles };

/** @internal */
export type LensLink = {
  type: "link";
  href: string;
  content: LensStyledText[];
};

/** @internal */
export type LensInlineContent =
  | LensStyledText
  | LensLink
  | LensCustomInlineContent;

/** @internal */
export type LensTableCell = {
  type: "tableCell";
  props: Record<string, unknown>;
  content: LensInlineContent[];
};

/** @internal */
export type LensTableContent = {
  type: "tableContent";
  columnWidths: (number | undefined)[];
  headerRows?: number;
  headerCols?: number;
  rows: { cells: LensInlineContent[][] | LensTableCell[] }[];
};

/**
 * Inline content (also for "plain" content), a table, or no content.
 *
 * @internal
 */
export type LensBlockContent =
  | LensInlineContent[]
  | LensTableContent
  | undefined;

export type LensBlock = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  content: LensBlockContent;
  children: LensBlock[];
};

/**
 * The fields of a block that a merge or an update changes: not its ID and children.
 *
 * @internal
 */
export type BlockFields = Pick<LensBlock, "type" | "props" | "content">;

/**
 * The fields of a block to set (see `BlockNoteEditor.updateBlock`).
 *
 * @internal
 */
export type LensPartialBlock = Partial<BlockFields>;

/**
 * The type of content that a block type has (see `BlockConfig.content`).
 *
 * @internal
 */
export type ContentKind = "inline" | "plain" | "table" | "none";

/** One block of a block tree, in a flat list in pre-order (document order). */
/**
 * A block without its children: its ID and its own fields.
 *
 * @internal
 */
export type BlockWithoutChildren = Omit<LensBlock, "children">;

/** @internal */
export type FlatBlock = {
  /** The block, without its children: the flat list has them (see `parentIndex`). */
  block: BlockWithoutChildren;
  /** The index of the parent in the flat list. `undefined` for top-level blocks. */
  parentIndex: number | undefined;
};

/** @internal */
export function isStyledText(item: LensInlineContent): item is LensStyledText {
  return item.type === "text";
}

/** @internal */
export function isLink(item: LensInlineContent): item is LensLink {
  return item.type === "link";
}

/** @internal */
export function isTableContent(
  content: LensBlockContent,
): content is LensTableContent {
  return (
    content !== undefined &&
    !Array.isArray(content) &&
    content.type === "tableContent"
  );
}

/**
 * The shape of the content of a block: text (inline content or plain content), a table, or no content.
 *
 * @internal
 */
export type ContentShape = "text" | "table" | "none";

/** @internal */
export function contentShape(content: LensBlockContent): ContentShape {
  if (Array.isArray(content)) {
    return "text";
  }
  return isTableContent(content) ? "table" : "none";
}

/**
 * Custom inline content, for example a mention. The lens uses it as one unit and does not look inside it.
 */
type LensCustomInlineContent = {
  type: string;
  props: Record<string, unknown>;
  /** Styled text, plain text (a string), or no content. The config of the content type sets which one. */
  content?: LensStyledText[] | string;
};
