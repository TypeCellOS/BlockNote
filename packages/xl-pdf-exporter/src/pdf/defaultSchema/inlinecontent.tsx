import { DefaultInlineContentSchema } from "@blocknote/core";
import { InlineContentMapping } from "@blocknote/core/src/exporter/mapping.js";
import { Link, Text } from "@react-pdf/renderer";

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
