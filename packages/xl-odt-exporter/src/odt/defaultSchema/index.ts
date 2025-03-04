import { odtBlockMappingForDefaultSchema } from "./blocks.js";
import { odtInlineContentMappingForDefaultSchema } from "./inlineContent.js";
import { odtStyleMappingForDefaultSchema } from "./styles.js";

export const odtDefaultSchemaMappings = {
  blockMapping: odtBlockMappingForDefaultSchema,
  inlineContentMapping: odtInlineContentMappingForDefaultSchema,
  styleMapping: odtStyleMappingForDefaultSchema,
};
