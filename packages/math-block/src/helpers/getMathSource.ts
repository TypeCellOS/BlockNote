/** The block's LaTeX source - its plain text content. */
export const getMathSource = (block: { content: unknown }): string => {
  // Partial blocks (e.g. when exporting) carry their content as a plain string,
  // while editor blocks carry it as an array of inline content nodes.
  if (typeof block.content === "string") {
    return block.content;
  }
  if (Array.isArray(block.content)) {
    return block.content
      .map((node) =>
        node && typeof node === "object" && "text" in node ? node.text : "",
      )
      .join("");
  }
  return "";
};
