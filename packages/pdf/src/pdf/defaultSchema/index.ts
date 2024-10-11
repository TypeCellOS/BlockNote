import { pdfBlockMappingForDefaultSchema } from "./blocks";
import { pdfInlineContentMappingForDefaultSchema } from "./inlinecontent";
import { pdfStyleMappingForDefaultSchema } from "./styles";

export const pdfDefaultSchemaMappings = {
  styleMapping: pdfStyleMappingForDefaultSchema,
  blockMapping: pdfBlockMappingForDefaultSchema,
  inlineContentMapping: pdfInlineContentMappingForDefaultSchema,
};
