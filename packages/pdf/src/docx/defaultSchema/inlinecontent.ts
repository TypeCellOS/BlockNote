import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "@blocknote/core";
import { ExternalHyperlink, ParagraphChild, TextRun } from "docx";
import { InlineContentMapping } from "../../mapping.js";

export const docxInlineContentMappingForDefaultSchema = {
  link: (ic, styledTextTransformer) => {
    return new ExternalHyperlink({
      children: ic.content.map((content) => {
        return styledTextTransformer(content);
      }),
      link: ic.href,
    });
  },
  text: (ic, styledTextTransformer) => {
    return styledTextTransformer(ic);
  },
} satisfies InlineContentMapping<
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  ParagraphChild,
  TextRun
>;
