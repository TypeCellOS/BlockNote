import { deepEqual } from "../blocks/json.js";
import { inlineContentToText } from "../blocks/text.js";
import {
  type BlockFields,
  type ContentKind,
  isTableContent,
  type LensBlockContent,
  type LensInlineContent,
} from "../blocks/types.js";
import { mergeInlineContent } from "./inline.js";
import { mergeTableContent } from "./table.js";
import { mergeRecords } from "./threeWay.js";

/**
 * Three-way merge of the fields of one block (see `threeWay.ts` for the
 * rule). In the planner, `base` is the view block, `ours` is the block from
 * the text, and `theirs` is the block in the document. In the rebase, `base`
 * is the block at the version that the client read, `ours` is that block
 * with the update, and `theirs` is the current block.
 *
 * The type changes only if `ours` changed it. Thus, a toggle list item stays
 * a toggle, although markdown shows it as a bullet. The merge merges each
 * prop of the three blocks. It merges inline content character by character,
 * and tables cell by cell.
 */
export function mergeBlock(
  base: BlockFields,
  ours: BlockFields,
  theirs: BlockFields,
  contentKindOf: (type: string) => ContentKind,
): BlockFields {
  const type = base.type !== ours.type ? ours.type : theirs.type;
  const kind = contentKindOf(type);
  // If the content did not change, the content of theirs stays as one item.
  // This is also correct for content that a piece-by-piece merge cannot
  // merge, for example a table with merged cells (the format shows them as
  // separate cells).
  const content =
    deepEqual(base.content, ours.content) && contentKindOf(theirs.type) === kind
      ? theirs.content
      : mergeContent(base, ours, theirs, kind);

  return {
    type,
    props: mergeRecords(base.props, ours.props, theirs.props),
    content,
  };
}

function mergeContent(
  base: BlockFields,
  ours: BlockFields,
  theirs: BlockFields,
  kind: ContentKind,
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
        return mergeTableContent(base.content, ours.content, theirs.content);
      }
      return ours.content;
    case "inline":
    case "plain": {
      if (!Array.isArray(ours.content)) {
        return ours.content;
      }
      const merged =
        Array.isArray(base.content) && Array.isArray(theirs.content)
          ? mergeInlineContent(base.content, ours.content, theirs.content)
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
