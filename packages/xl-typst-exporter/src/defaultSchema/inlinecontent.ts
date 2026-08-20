import {
  DefaultInlineContentSchema,
  InlineContentMapping,
} from "@blocknote/core";
import { strLit } from "../util.js";

/**
 * Inline content maps to a Typst *expression* (no leading `#`). The block layer
 * adds the `#` when it splices these into markup.
 */
export const typstInlineContentMappingForDefaultSchema: InlineContentMapping<
  DefaultInlineContentSchema,
  any,
  string,
  string
> = {
  text: (ic, exporter) => exporter.transformStyledText(ic) as unknown as string,
  link: (ic, exporter) => {
    const inner = ic.content
      .map((c) => "#" + (exporter.transformStyledText(c) as unknown as string))
      .join("");
    return `link(${strLit(ic.href)})[${inner}]`;
  },
};
