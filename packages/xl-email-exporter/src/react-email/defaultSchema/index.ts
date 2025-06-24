import { reactEmailBlockMappingForDefaultSchema } from "./blocks.js";
import { reactEmailInlineContentMappingForDefaultSchema } from "./inlinecontent";
import { reactEmailStyleMappingForDefaultSchema } from "./styles";

export const reactEmailDefaultSchemaMappings = {
  blockMapping: reactEmailBlockMappingForDefaultSchema,
  inlineContentMapping: reactEmailInlineContentMappingForDefaultSchema,
  styleMapping: reactEmailStyleMappingForDefaultSchema,
};
