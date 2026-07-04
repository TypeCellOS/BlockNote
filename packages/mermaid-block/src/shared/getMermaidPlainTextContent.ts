// Converts rich text content in mermaid blocks to the plain text Mermaid
// source. Should be removed once we add plain text support for blocks.
export const getMermaidPlainTextContent = (content: unknown): string => {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((node) =>
      node && typeof node === "object" && "text" in node ? node.text : "",
    )
    .join("");
};
// TODO: remove