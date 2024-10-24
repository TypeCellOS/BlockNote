import { DefaultInlineContentSchema } from "@blocknote/core";
import { Link, Text } from "@react-pdf/renderer";
import { InlineContentMapping } from "../../mapping.js";

export const pdfInlineContentMappingForDefaultSchema: InlineContentMapping<
  DefaultInlineContentSchema,
  any,
  React.ReactElement<Link> | React.ReactElement<Text>,
  React.ReactElement<Text>
> = {
  link: (ic, exporter) => {
    return (
      <Link href={ic.href}>
        {ic.content.map((content) => exporter.transformStyledText(content))}
      </Link>
    );
  },
  text: (ic, exporter) => {
    return exporter.transformStyledText(ic);
  },
};
