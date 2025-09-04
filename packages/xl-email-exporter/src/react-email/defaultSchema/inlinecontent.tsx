import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentMapping,
} from "@blocknote/core";
import { Link } from "@react-email/components";

// Define the styles interface for configurable Link components
export interface ReactEmailLinkStyles {
  link?: Partial<React.ComponentPropsWithoutRef<typeof Link>>;
}

// Default styles for Link components
export const defaultReactEmailLinkStyles: ReactEmailLinkStyles = {
  link: {},
};

export const createReactEmailInlineContentMappingForDefaultSchema = (
  linkStyles: ReactEmailLinkStyles = defaultReactEmailLinkStyles,
): InlineContentMapping<
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  React.ReactElement<typeof Link> | React.ReactElement<HTMLSpanElement>,
  React.ReactElement<HTMLSpanElement>
> => ({
  link: (ic, t) => {
    return (
      <Link href={ic.href} {...linkStyles.link}>
        {...ic.content.map((content) => {
          return t.transformStyledText(content);
        })}
      </Link>
    );
  },
  text: (ic, t) => {
    return t.transformStyledText(ic);
  },
});

// Export the original mapping for backward compatibility
export const reactEmailInlineContentMappingForDefaultSchema =
  createReactEmailInlineContentMappingForDefaultSchema();
