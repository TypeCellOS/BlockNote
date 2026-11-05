/**
 * The block JSON that the lens uses. It is the `Block` JSON of BlockNote, with
 * structural types. Thus, the lens can use it without the schema of the editor.
 *
 * Note: `Block<BlockSchema, ...>` with the generic schema types does not
 * narrow. For example, its `content` type is `never`.
 */

/** The styles of a text: `true` for a style that is on or off (bold), or a value (text color). */
export type LensStyles = Record<string, string | boolean | undefined>;

export type LensStyledText = { type: "text"; text: string; styles: LensStyles };

export type LensLink = {
  type: "link";
  href: string;
  content: LensStyledText[];
};

/** Custom inline content, for example a mention. The lens uses it as one unit and does not look inside it. */
export type LensCustomInlineContent = {
  type: string;
  props: Record<string, unknown>;
  /** Styled text, plain text (a string), or no content. The config of the content type sets which one. */
  content?: LensStyledText[] | string;
};

export type LensInlineContent =
  | LensStyledText
  | LensLink
  | LensCustomInlineContent;

export type LensTableCell = {
  type: "tableCell";
  props: Record<string, unknown>;
  content: LensInlineContent[];
};

export type LensTableContent = {
  type: "tableContent";
  columnWidths: (number | undefined)[];
  headerRows?: number;
  headerCols?: number;
  rows: { cells: LensInlineContent[][] | LensTableCell[] }[];
};

/** Inline content (also for "plain" content), a table, or no content. */
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

/** The fields of a block that a merge or an update changes: not its ID and children. */
export type BlockFields = Pick<LensBlock, "type" | "props" | "content">;

/** The fields of a block to set (see `BlockNoteEditor.updateBlock`). */
export type LensPartialBlock = Partial<BlockFields>;

/** The type of content that a block type has (see `BlockConfig.content`). */
export type ContentKind = "inline" | "plain" | "table" | "none";

/** One block of a block tree, in a flat list in pre-order (document order). */
export type FlatBlock = {
  /** The block, with only its own fields. `children` is always empty. */
  block: LensBlock;
  /** The index of the parent in the flat list. `undefined` for top-level blocks. */
  parentIndex: number | undefined;
};

export function isStyledText(item: LensInlineContent): item is LensStyledText {
  return item.type === "text";
}

export function isLink(item: LensInlineContent): item is LensLink {
  return item.type === "link";
}

export function isTableContent(
  content: LensBlockContent,
): content is LensTableContent {
  return (
    content !== undefined &&
    !Array.isArray(content) &&
    content.type === "tableContent"
  );
}

/** The shape of the content of a block: text (inline content or plain content), a table, or no content. */
export type ContentShape = "text" | "table" | "none";

export function contentShape(content: LensBlockContent): ContentShape {
  if (Array.isArray(content)) {
    return "text";
  }
  return isTableContent(content) ? "table" : "none";
}

/** The inline content (or plain content) of a block, or no content for a block without it. */
export function inlineContentOf(block: BlockFields): LensInlineContent[] {
  return Array.isArray(block.content) ? block.content : [];
}
