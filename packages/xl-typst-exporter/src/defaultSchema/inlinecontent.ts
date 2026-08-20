import {
  DefaultInlineContentSchema,
  InlineContentMapping,
} from "@blocknote/core";
import { strLit } from "../util.js";

/**
 * Inline content maps to Typst *markup* (leading `#`), so inline results
 * compose by plain concatenation - block mappings embed them with
 * `exporter.transformInlineContent(content).join("")`, the same base-Exporter
 * seam the other exporters use. (Styled text stays in *expression* form
 * internally: style wrappers nest as `strong(emph("x"))`; the inline mapping
 * is where the expression becomes markup.)
 */
export const typstInlineContentMappingForDefaultSchema: InlineContentMapping<
  DefaultInlineContentSchema,
  any,
  string,
  string
> = {
  text: (ic, exporter) =>
    "#" + (exporter.transformStyledText(ic) as unknown as string),
  link: (ic, exporter) => {
    const inner = ic.content
      .map((c) => "#" + (exporter.transformStyledText(c) as unknown as string))
      .join("");
    return `#link(${strLit(ic.href)})[${inner}]`;
  },
};
