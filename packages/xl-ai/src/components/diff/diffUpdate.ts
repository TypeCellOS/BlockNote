import {
  Block,
  DefaultBlockSchema,
  InlineContent,
  InlineContentSchema,
  StyleSchema,
  isStyledTextInlineContent,
} from "@blocknote/core";
import * as Diff from "diff";

export function getDiffs<
  BSchema extends DefaultBlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(oldBlock: Block<BSchema, I, S>, newBlock: Block<BSchema, I, S>) {
  if (oldBlock.type !== "paragraph" || newBlock.type !== "paragraph") {
    throw new Error("Only paragraph blocks are supported");
  }
  const oldContent = (oldBlock as any).content?.[0] as InlineContent<I, S>;
  const newContent = (newBlock as any).content?.[0] as InlineContent<I, S>;

  if (
    !isStyledTextInlineContent(oldContent) ||
    !isStyledTextInlineContent(newContent)
  ) {
    throw new Error("Only one text content is supported");
  }
  const charDiffs = Diff.diffWords(oldContent.text, newContent.text);

  return charDiffs;
}
