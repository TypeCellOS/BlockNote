import { docxBlockMappingForDefaultSchema } from "./blocks.js";
import { docxInlineContentMappingForDefaultSchema } from "./inlinecontent.js";
import { docxStyleMappingForDefaultSchema } from "./styles.js";

export const docxDefaultSchemaMappings = {
  blockMapping: docxBlockMappingForDefaultSchema,
  inlineContentMapping: docxInlineContentMappingForDefaultSchema,
  styleMapping: docxStyleMappingForDefaultSchema,
};
