import { Block } from "@blocknote/core";
import { trimArray } from "../../util/trimArray.js";

function isEmptyParagraph(block: Block<any, any, any>) {
    return (
      block.type === "paragraph" &&
      Array.isArray(block.content) &&
      block.content.length === 0
    );
  }

export function trimEmptyBlocks(source: Block<any, any, any>[], opts?: {
    trimStart?: boolean;
    trimEnd?: boolean;
}) {
    // trim empty trailing blocks that don't have the cursor
  // if we don't do this, commands like "add some paragraphs"
  // would add paragraphs after the trailing blocks
  const trimmedSource = trimArray(
    source,
    (block) => {
      return isEmptyParagraph(block)
    },
    opts?.trimStart,
    opts?.trimEnd
  );

  return trimmedSource;
}