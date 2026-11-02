import {
  isStyledText,
  isTableContent,
  type LensBlock,
  type LensInlineContent,
  type LensTableContent,
} from "./types.js";

/** Returns the text of inline content or plain content. Custom inline content without text gives no text. */
export function inlineContentToText(
  content: readonly LensInlineContent[],
): string {
  let text = "";
  for (const item of content) {
    if (isStyledText(item)) {
      text += item.text;
    } else if (typeof item.content === "string") {
      text += item.content;
    } else if (item.content !== undefined) {
      // A link, or custom inline content that has styled text.
      text += item.content.map((styledText) => styledText.text).join("");
    }
  }
  return text;
}

/** Returns the cells of a table row as inline content. A row can contain cells in two forms. */
export function tableCellsContent(
  row: LensTableContent["rows"][number],
): LensInlineContent[][] {
  return row.cells.map((cell) => (Array.isArray(cell) ? cell : cell.content));
}

/** Returns the text of the block itself, not of its children: inline content, plain content or table cells. */
export function blockToText(block: LensBlock): string {
  const content = block.content;
  if (Array.isArray(content)) {
    return inlineContentToText(content);
  }
  if (isTableContent(content)) {
    return content.rows
      .map((row) => tableCellsContent(row).map(inlineContentToText).join(" "))
      .join("\n");
  }
  return "";
}
