// Converts rich text content in math blocks/inline content to plain text.
// Should be removed once we add plain text support for blocks/inline content
export const getMathPlainTextContent = (content: unknown): string => {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((node) =>
        node && typeof node === "object" && "text" in node ? node.text : "",
      )
      .join("");
  }
  return "";
};
