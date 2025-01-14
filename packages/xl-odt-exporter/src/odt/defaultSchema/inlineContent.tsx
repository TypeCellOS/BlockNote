import {
  DefaultInlineContentSchema,
  InlineContentMapping,
} from "@blocknote/core";
import { createElement } from "react";

export const odtInlineContentMappingForDefaultSchema: InlineContentMapping<
  DefaultInlineContentSchema,
  any,
  JSX.Element,
  JSX.Element
> = {
  link: (ic, exporter) => {
    const content = ic.content
      .map((c) => exporter.transformStyledText(c))
      .join("");
    return <text:a xlink:href={ic.href}>{content}</text:a>;
  },

  text: (ic, exporter) => {
    return exporter.transformStyledText(ic);
  },
};
