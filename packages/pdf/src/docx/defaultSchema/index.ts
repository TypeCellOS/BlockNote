import { docxBlockMappingForDefaultSchema } from "./blocks";
import { docxInlineContentMappingForDefaultSchema } from "./inlinecontent";
import { docxStyleMappingForDefaultSchema } from "./styles";

export const docxDefaultSchemaMappings = {
  styleMapping: docxStyleMappingForDefaultSchema,
  blockMapping: docxBlockMappingForDefaultSchema,
  inlineContentMapping: docxInlineContentMappingForDefaultSchema,
};
