import { BlockNoteSchema, StyleSchema, StyledText } from "@blocknote/core";
import { ExternalHyperlink, ParagraphChild } from "docx";
import { mappingFactory } from "../mapping";

export function docxInlineContentMappingForDefaultSchema(
  styledTextTransformer: (styledText: StyledText<StyleSchema>) => ParagraphChild
) {
  return mappingFactory(
    BlockNoteSchema.create()
  ).createInlineContentMapping<ParagraphChild>({
    link: (ic) => {
      return new ExternalHyperlink({
        children: ic.content.map((content) => {
          return styledTextTransformer(content);
        }),
        link: ic.href,
      });
    },
    text: (ic) => {
      return styledTextTransformer(ic);
    },
  });
}
