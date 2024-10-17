import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "@blocknote/core";
import { Link, Text } from "@react-pdf/renderer";
import { InlineContentMapping } from "../../mapping.js";

export const pdfInlineContentMappingForDefaultSchema = {
  link: (ic, st) => {
    return (
      <Link href={ic.href}>
        {...ic.content.map((content) => {
          return st(content);
        })}
      </Link>
    );
  },
  text: (ic, st) => {
    return st(ic);
  },
} satisfies InlineContentMapping<
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  React.ReactElement<Link> | React.ReactElement<Text>,
  React.ReactElement<Text>
>;
