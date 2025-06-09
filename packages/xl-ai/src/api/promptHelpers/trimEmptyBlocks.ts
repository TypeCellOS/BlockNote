import { Block } from "@blocknote/core";
import { isEmptyParagraph } from "../../util/emptyBlock.js";
import { trimArray } from "../../util/trimArray.js";

export function trimEmptyBlocks(
  source: Block<any, any, any>[],
  opts?: {
    trimStart?: boolean;
    trimEnd?: boolean;
  },
) {
  if (source.length === 1) {
    // don't trim empty blocks from a single block document
    return source;
  }
  // trim empty trailing blocks that don't have the cursor
  // if we don't do this, commands like "add some paragraphs"
  // would add paragraphs after the trailing blocks
  const trimmedSource = trimArray(
    source,
    (block) => {
      return isEmptyParagraph(block);
    },
    opts?.trimStart ?? false,
    opts?.trimEnd ?? true,
  );

  return trimmedSource;
}
