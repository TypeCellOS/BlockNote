import {
  type BlockFields,
  type ContentKind,
  contentShape,
  type ContentShape,
  isTableContent,
  type LensBlockContent,
  type LensInlineContent,
} from "../model.js";
import { deepEqual, inlineContentToText } from "../util/blocks/index.js";
import { mergeInlineContent } from "./inline.js";
import { mergeTableContent } from "./table.js";
import {
  type MergeOptions,
  mergeRecords,
  mergeValue,
  TARGET_WITHOUT_SHADOWS,
} from "./threeWay.js";

/**
 * Three-way merge of the fields of one block (see `threeWay.ts` for the
 * rule). In the target stage, `base` is the view block, `ours` is the block from
 * the text, and `theirs` is the block in the document. In the document merge,
 * `base` is the block at the version that the client read, `ours` is that block
 * with the update, and `theirs` is the current block.
 *
 * The type changes only if a side changed it. Thus, a toggle list item stays
 * a toggle, although markdown shows it as a bullet. There is one exception:
 * if `ours` changed the content, and that type cannot hold the content of
 * `ours`, the type of `ours` wins. An example is a file block without a
 * caption, which markdown shows as a paragraph with a link: a change of the
 * link text makes the block a paragraph. In the document merge, that is a
 * conflict: the type and the content of `theirs` win (see `MergeOptions`).
 *
 * The merge merges each prop (see {@link mergeProps}). It merges inline
 * content character by character, and tables cell by cell.
 *
 * Method: our own design: the three-way rule for each field and prop, and diff3
 * for the content (see `mergeInlineContent` and `mergeTableContent`).
 */
export function mergeBlock(
  base: BlockFields,
  ours: BlockFields,
  theirs: BlockFields,
  contentKindOf: (type: string) => ContentKind,
  options: MergeOptions = TARGET_WITHOUT_SHADOWS,
): BlockFields {
  const contentChanged = !deepEqual(base.content, ours.content);
  const merged = mergeValue(base.type, ours.type, theirs.type, options);
  // The type of theirs cannot hold the content of ours.
  const clash =
    contentChanged &&
    merged !== ours.type &&
    !canHold(contentKindOf(merged), ours.content);
  if (clash && options.kind === "document") {
    options.onConflict();
  }
  const type = clash && options.kind === "target" ? ours.type : merged;
  const kind = contentKindOf(type);
  // If the content did not change, the content of theirs stays as one item.
  // This is also correct for content that a piece-by-piece merge cannot
  // merge, for example a table with merged cells (the format shows them as
  // separate cells).
  const content =
    clash && options.kind === "document"
      ? // The change of the content of ours is lost.
        theirs.content
      : contentKindOf(theirs.type) !== kind
        ? // The kind of content changed: theirs has no content of this kind
          // to merge with. Thus, the content of ours applies as it is.
          contentOfKind(ours.content, kind)
        : contentChanged
          ? mergeContent(base, ours, theirs, kind, options)
          : theirs.content;

  return {
    type,
    props: mergeProps(base, ours, theirs, type, options),
    content,
  };
}

/** The shape of the content that a block with content of each kind holds. */
const SHAPE_OF_KIND: Record<ContentKind, ContentShape> = {
  inline: "text",
  plain: "text",
  table: "table",
  none: "none",
};

/** Returns true if a block with content of this kind can hold the content. */
function canHold(kind: ContentKind, content: LensBlockContent): boolean {
  return contentShape(content) === SHAPE_OF_KIND[kind];
}

/**
 * Merges the props of the result type. If `ours` and `theirs` have the same
 * type, all keys of the three blocks count, because a block can lack a prop.
 * If not, only the props of the side with the result type are valid for that
 * type. For a key that the other side also has, the values merge.
 */
function mergeProps(
  base: BlockFields,
  ours: BlockFields,
  theirs: BlockFields,
  type: string,
  options: MergeOptions,
): Record<string, unknown> {
  if (ours.type === theirs.type) {
    return mergeRecords(base.props, ours.props, theirs.props, options);
  }
  const [side, other] = type === ours.type ? [ours, theirs] : [theirs, ours];
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(side.props)) {
    const merged =
      key in other.props
        ? mergeValue(
            base.props[key],
            ours.props[key],
            theirs.props[key],
            options,
          )
        : value;
    if (merged !== undefined) {
      props[key] = merged;
    }
  }
  return props;
}

function mergeContent(
  base: BlockFields,
  ours: BlockFields,
  theirs: BlockFields,
  kind: ContentKind,
  options: MergeOptions,
): LensBlockContent {
  switch (kind) {
    case "none":
      return undefined;
    case "table":
      if (
        isTableContent(base.content) &&
        isTableContent(ours.content) &&
        isTableContent(theirs.content)
      ) {
        return mergeTableContent(
          base.content,
          ours.content,
          theirs.content,
          options,
        );
      }
      return ours.content;
    case "inline":
    case "plain": {
      if (!Array.isArray(ours.content)) {
        return ours.content;
      }
      const merged =
        Array.isArray(base.content) && Array.isArray(theirs.content)
          ? mergeInlineContent(
              base.content,
              ours.content,
              theirs.content,
              options,
            )
          : ours.content;
      return kind === "plain" ? toPlainContent(merged) : merged;
    }
  }
}

/** Plain content (for example of a code block) cannot have styles, links or custom inline content. */
function toPlainContent(content: LensInlineContent[]): LensInlineContent[] {
  const text = inlineContentToText(content);
  return text.length > 0 ? [{ type: "text", text, styles: {} }] : [];
}

/** The content of ours for a block with content of this kind: plain content has only text. */
function contentOfKind(
  content: LensBlockContent,
  kind: ContentKind,
): LensBlockContent {
  return kind === "plain" && Array.isArray(content)
    ? toPlainContent(content)
    : content;
}
