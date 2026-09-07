import { typstBlockMappingForDefaultSchema } from "./blocks.js";
import { typstInlineContentMappingForDefaultSchema } from "./inlinecontent.js";
import { typstStyleMappingForDefaultSchema } from "./styles.js";

export const typstDefaultSchemaMappings = {
  blockMapping: typstBlockMappingForDefaultSchema,
  inlineContentMapping: typstInlineContentMappingForDefaultSchema,
  styleMapping: typstStyleMappingForDefaultSchema,
};

export {
  typstBlockMappingForDefaultSchema,
  typstInlineContentMappingForDefaultSchema,
  typstStyleMappingForDefaultSchema,
};
