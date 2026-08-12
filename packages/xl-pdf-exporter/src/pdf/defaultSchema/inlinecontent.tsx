import {
  DefaultInlineContentSchema,
  InlineContentMapping,
} from "@blocknote/core";
import { Link, Text } from "@react-pdf/renderer";

type ICSchema = DefaultInlineContentSchema & {
  math: {
    type: "math";
    propSchema: Record<string, never>;
    content: "plain";
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
  math: (ic) => {
    return (
      <Text key={"math"} style={{ fontFamily: "GeistMono" }}>
        {ic.content}
      </Text>
    );
  },
};
