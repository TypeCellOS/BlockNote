import { Block } from "@blocknote/core";

export function isEmptyParagraph(block: Block<any, any, any>) {
  return (
    block.type === "paragraph" &&
    Array.isArray(block.content) &&
    block.content.length === 0
  );
}
