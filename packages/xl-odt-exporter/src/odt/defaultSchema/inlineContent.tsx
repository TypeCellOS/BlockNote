import {
  DefaultInlineContentSchema,
  InlineContentMapping,
} from "@blocknote/core";
import { TextA } from "../util/components.js";

export const odtInlineContentMappingForDefaultSchema: InlineContentMapping<
  DefaultInlineContentSchema,
  any,
  JSX.Element,
  JSX.Element
> = {
  link: (ic, exporter) => {
    const content = ic.content.map((c) => exporter.transformStyledText(c));
    return <TextA href={ic.href}>{content}</TextA>;
  },

  text: (ic, exporter) => {
    return exporter.transformStyledText(ic);
  },
};
