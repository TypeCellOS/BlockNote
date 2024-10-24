import { reactEmailBlockMappingForDefaultSchema } from "./blocks.js";
import { reactEmailInlineContentMappingForDefaultSchema } from "./inlinecontent.js";
import { reactEmailStyleMappingForDefaultSchema } from "./styles.js";

export const reactEmailDefaultSchemaMappings = {
  blockMapping: reactEmailBlockMappingForDefaultSchema,
  inlineContentMapping: reactEmailInlineContentMappingForDefaultSchema,
  styleMapping: reactEmailStyleMappingForDefaultSchema,
};
