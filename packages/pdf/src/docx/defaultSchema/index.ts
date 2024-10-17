import { docxBlockMappingForDefaultSchema } from "./blocks.js";
import { docxInlineContentMappingForDefaultSchema } from "./inlinecontent.js";
import { docxStyleMappingForDefaultSchema } from "./styles.js";

export const docxDefaultSchemaMappings = {
  styleMapping: docxStyleMappingForDefaultSchema,
  blockMapping: docxBlockMappingForDefaultSchema,
  inlineContentMapping: docxInlineContentMappingForDefaultSchema,
};
