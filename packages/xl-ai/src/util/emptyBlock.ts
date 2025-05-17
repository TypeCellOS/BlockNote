import type { PartialBlock } from "@blocknote/core";

export function isEmptyParagraph(block: PartialBlock<any, any, any>) {
  return (
    ((block.type === "paragraph" || !block.type) && !block.content) ||
    (Array.isArray(block.content) && block.content.length === 0)
  );
}
