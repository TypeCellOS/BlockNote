import { BlockNoteSchema, StyleSchema, StyledText } from "@blocknote/core";
import { Link, Text } from "@react-pdf/renderer";
import { mappingFactory } from "../mapping";

export function pdfInlineContentMappingForDefaultSchema(
  styledTextTransformer: (
    styledText: StyledText<StyleSchema>
  ) => React.ReactElement<Text>
) {
  return mappingFactory(BlockNoteSchema.create()).createInlineContentMapping<
    React.ReactElement<Link> | React.ReactElement<Text>
  >({
    link: (ic) => {
      return (
        <Link href={ic.href}>
          {...ic.content.map((content) => {
            return styledTextTransformer(content);
          })}
        </Link>
      );
    },
    text: (ic) => {
      return styledTextTransformer(ic);
    },
  });
}
