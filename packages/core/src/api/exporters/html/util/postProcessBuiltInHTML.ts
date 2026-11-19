/** Framework-wide normalization, after block-owned hooks have finalized the DOM. */
export function postProcessBuiltInHTML(dom: ParentNode) {
  // ProseMirror adds these only in a live view. Preserve the height of empty
  // inline content, including custom blocks and paragraphs inside table cells.
  for (const inlineContent of dom.querySelectorAll(
    ".bn-block-content .bn-inline-content:empty",
  )) {
    const trailingBreak = inlineContent.ownerDocument.createElement("span");
    trailingBreak.className = "ProseMirror-trailingBreak";
    trailingBreak.setAttribute("style", "display: inline-block;");
    inlineContent.appendChild(trailingBreak);
  }
}
