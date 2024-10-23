import { DefaultInlineContentSchema } from "@blocknote/core";
import { Link, Text } from "@react-pdf/renderer";
import { InlineContentMapping } from "../../mapping.js";

export const pdfInlineContentMappingForDefaultSchema: InlineContentMapping<
  DefaultInlineContentSchema,
  any,
  React.ReactElement<Link> | React.ReactElement<Text>,
  React.ReactElement<Text>
> = {
  link: (ic, transformer) => {
    return (
      <Link href={ic.href}>
        {ic.content.map((content) => transformer.transformStyledText(content))}
      </Link>
    );
  },
  text: (ic, t) => {
    return t.transformStyledText(ic);
  },
};
