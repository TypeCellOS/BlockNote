import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  StyleSchema,
  StyledText,
} from "@blocknote/core";
import { Link } from "@react-email/components";
import { InlineContentMapping } from "../../mapping.js";

export const reactEmailInlineContentMappingForDefaultSchema = {
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
  React.ReactElement<typeof Link> | React.ReactElement<HTMLSpanElement>,
  (text: StyledText<StyleSchema>) => React.ReactElement<HTMLSpanElement>
>;
