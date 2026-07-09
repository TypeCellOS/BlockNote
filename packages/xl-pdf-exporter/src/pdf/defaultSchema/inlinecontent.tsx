import {
  DefaultInlineContentSchema,
  InlineContentMapping,
} from "@blocknote/core";
import { Link, Text } from "@react-pdf/renderer";

type ICSchema = DefaultInlineContentSchema & {
  inlineMath: {
    type: "inlineMath";
    propSchema: Record<string, never>;
    content: "styled";
  };
};

export const pdfInlineContentMappingForDefaultSchema: InlineContentMapping<
  ICSchema,
  any,
  React.ReactElement<Link> | React.ReactElement<Text>,
  React.ReactElement<Text>
> = {
  link: (ic, exporter) => {
    return (
      <Link href={ic.href} key={"link" + ic.href}>
        {ic.content.map((content) => exporter.transformStyledText(content))}
      </Link>
    );
  },
  text: (ic, exporter) => {
    return exporter.transformStyledText(ic);
  },
  // TODO
  // Renders inline math as its monospaced LaTeX source.
  inlineMath: (ic, exporter) => {
    return (
      <Text key={"inlineMath"} style={{ fontFamily: "GeistMono" }}>
        {ic.content.map((content) => exporter.transformStyledText(content))}
      </Text>
    );
  },
};
