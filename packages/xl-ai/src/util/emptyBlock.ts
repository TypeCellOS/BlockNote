import type { Block } from "@blocknote/core";

export function isEmptyParagraph(block: Block<any, any, any>) {
  return (
    ((block.type === "paragraph" || !block.type) && !block.content) ||
    (Array.isArray(block.content) && block.content.length === 0)
  );
}
