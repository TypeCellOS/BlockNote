import { strLit } from "@blocknote/xl-typst-exporter";
import { sourceContent, type SourceBlock } from "../exporters/sourceContent.js";

/** Shared by standalone Typst and the current Typst-backed PDFExporter. */
function sourceBlockMapping(block: SourceBlock): string {
  const { label, description, source, href } = sourceContent(block);
  const lines = [
    href ? `#link(${strLit(href)})[#${strLit(label)}]` : `#${strLit(label)}`,
  ];
  if (description) {
    lines.push(`#${strLit(description)}`);
  }
  if (source && source !== label) {
    lines.push(
      href
        ? `#link(${strLit(href)})[#${strLit(source)}]`
        : `#${strLit(source)}`,
    );
  }
  return lines.join("\n\n");
}

export {
  sourceBlockMapping as bookmarkBlockMapping,
  sourceBlockMapping as embedBlockMapping,
};
