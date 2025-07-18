import {
  reactEmailBlockMappingForDefaultSchema,
  createReactEmailBlockMappingForDefaultSchema,
  type ReactEmailTextStyles,
  defaultReactEmailTextStyles,
} from "./blocks.js";
import {
  reactEmailInlineContentMappingForDefaultSchema,
  createReactEmailInlineContentMappingForDefaultSchema,
  type ReactEmailLinkStyles,
  defaultReactEmailLinkStyles,
} from "./inlinecontent.js";
import {
  reactEmailStyleMappingForDefaultSchema,
  createReactEmailStyleMappingForDefaultSchema,
  type ReactEmailStyleTransformStyles,
  defaultReactEmailStyleTransformStyles,
} from "./styles.js";

// Re-export for backward compatibility
export { reactEmailBlockMappingForDefaultSchema } from "./blocks.js";
export { reactEmailInlineContentMappingForDefaultSchema } from "./inlinecontent.js";
export { reactEmailStyleMappingForDefaultSchema } from "./styles.js";

// Export the new configurable functions
export {
  createReactEmailBlockMappingForDefaultSchema,
  type ReactEmailTextStyles,
  defaultReactEmailTextStyles,
} from "./blocks.js";
export {
  createReactEmailInlineContentMappingForDefaultSchema,
  type ReactEmailLinkStyles,
  defaultReactEmailLinkStyles,
} from "./inlinecontent.js";
export {
  createReactEmailStyleMappingForDefaultSchema,
  type ReactEmailStyleTransformStyles,
  defaultReactEmailStyleTransformStyles,
} from "./styles.js";

// Export the combined styles interface
export interface ReactEmailDefaultSchemaStyles {
  textStyles?: ReactEmailTextStyles;
  linkStyles?: ReactEmailLinkStyles;
  styleTransformStyles?: ReactEmailStyleTransformStyles;
}

// Export the default combined styles
export const defaultReactEmailDefaultSchemaStyles: ReactEmailDefaultSchemaStyles =
  {
    textStyles: defaultReactEmailTextStyles,
    linkStyles: defaultReactEmailLinkStyles,
    styleTransformStyles: defaultReactEmailStyleTransformStyles,
  };

export const reactEmailDefaultSchemaMappings = {
  blockMapping: reactEmailBlockMappingForDefaultSchema,
  inlineContentMapping: reactEmailInlineContentMappingForDefaultSchema,
  styleMapping: reactEmailStyleMappingForDefaultSchema,
};

export const reactEmailDefaultSchemaMappingsWithStyles = (
  styles: ReactEmailDefaultSchemaStyles = defaultReactEmailDefaultSchemaStyles,
) => {
  return {
    blockMapping: createReactEmailBlockMappingForDefaultSchema(
      styles.textStyles,
    ),
    inlineContentMapping: createReactEmailInlineContentMappingForDefaultSchema(
      styles.linkStyles,
    ),
    styleMapping: createReactEmailStyleMappingForDefaultSchema(
      styles.styleTransformStyles,
    ),
  };
};
