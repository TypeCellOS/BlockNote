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

type ICSchema = DefaultInlineContentSchema & {
  inlineMath: {
    type: "inlineMath";
    propSchema: Record<string, never>;
    content: "styled";
  };
};

export const createReactEmailInlineContentMappingForDefaultSchema = (
  linkStyles: ReactEmailLinkStyles = defaultReactEmailLinkStyles,
): InlineContentMapping<
  ICSchema,
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
  // Renders inline math as its monospaced LaTeX source.
  inlineMath: (ic, t) => {
    return (
      <span style={{ fontFamily: "monospace" }}>
        {...ic.content.map((content) => t.transformStyledText(content))}
      </span>
    );
  },
});

// Export the original mapping for backward compatibility
export const reactEmailInlineContentMappingForDefaultSchema =
  createReactEmailInlineContentMappingForDefaultSchema();
